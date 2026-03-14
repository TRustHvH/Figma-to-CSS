
figma.showUI(__html__);

(async function initializeSettings() {
  try {
    const savedWidth = await figma.clientStorage.getAsync('windowWidth');
    const savedHeight = await figma.clientStorage.getAsync('windowHeight');
    const savedLang = await figma.clientStorage.getAsync('pluginLang');
    
    const width = savedWidth || 360;
    const height = savedHeight || 480;
    const lang = savedLang || 'en';
    
    figma.ui.resize(width, height);
    
    setTimeout(() => {
      figma.ui.postMessage({
        type: 'loaded-size',
        width,
        height
      });
      figma.ui.postMessage({
        type: 'loaded-lang',
        lang
      });
    }, 100);
  } catch (error) {
    figma.ui.resize(360, 480);
  }
})();

// Обработка сообщений от UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'close') {
    figma.closePlugin();
  } else if (msg.type === 'resize') {
    figma.ui.resize(msg.width, msg.height);
  } else if (msg.type === 'save-size') {
    try {
      await figma.clientStorage.setAsync('windowWidth', msg.width);
      await figma.clientStorage.setAsync('windowHeight', msg.height);
      
      figma.ui.postMessage({
        type: 'size-saved',
        success: true
      });
    } catch (error) {
      figma.ui.postMessage({
        type: 'size-saved',
        success: false
      });
    }
  } else if (msg.type === 'get-size') {
    figma.ui.postMessage({
      type: 'current-size',
      width: msg.currentWidth || 360,
      height: msg.currentHeight || 480
    });
  } else if (msg.type === 'save-lang') {
    try {
      await figma.clientStorage.setAsync('pluginLang', msg.lang);
      figma.ui.postMessage({ type: 'lang-saved', success: true });
    } catch (error) {
      figma.ui.postMessage({ type: 'lang-saved', success: false });
    }
  }
};

function rgbToHex(r, g, b) {
  const toHex = (n) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function rgbaToString(r, g, b, a) {
  if (a === 1) {
    return rgbToHex(r, g, b);
  }
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a.toFixed(2)})`;
}

function extractStyles(node) {
  let css = `/* ${node.name} */\n.selected {\n`;

  if ('width' in node && 'height' in node) {
    css += `  width: ${Math.round(node.width)}px;\n`;
    css += `  height: ${Math.round(node.height)}px;\n`;
  }

  if (node.type === 'TEXT') {
    if (typeof node.fontName !== 'symbol') {
      const fontName = node.fontName;
      css += `  font-family: "${fontName.family}", sans-serif;\n`;
      
      const style = fontName.style.toLowerCase();
      let weight = 400;
      if (style.includes('thin')) weight = 100;
      else if (style.includes('extralight') || style.includes('ultra light')) weight = 200;
      else if (style.includes('light')) weight = 300;
      else if (style.includes('regular') || style.includes('normal')) weight = 400;
      else if (style.includes('medium')) weight = 500;
      else if (style.includes('semibold') || style.includes('demi')) weight = 600;
      else if (style.includes('bold')) weight = 700;
      else if (style.includes('extrabold') || style.includes('ultra')) weight = 800;
      else if (style.includes('black') || style.includes('heavy')) weight = 900;
      
      css += `  font-weight: ${weight};\n`;
    }
    
    if (typeof node.fontSize !== 'symbol') {
      css += `  font-size: ${node.fontSize}px;\n`;
    }
    
    if (typeof node.lineHeight !== 'symbol' && node.lineHeight.unit !== 'AUTO') {
      if (node.lineHeight.unit === 'PIXELS') {
        css += `  line-height: ${node.lineHeight.value}px;\n`;
      } else if (node.lineHeight.unit === 'PERCENT') {
        css += `  line-height: ${(node.lineHeight.value / 100).toFixed(2)};\n`;
      }
    }
    
    if (typeof node.letterSpacing !== 'symbol' && node.letterSpacing.value !== 0) {
      if (node.letterSpacing.unit === 'PIXELS') {
        css += `  letter-spacing: ${node.letterSpacing.value}px;\n`;
      } else if (node.letterSpacing.unit === 'PERCENT') {
        css += `  letter-spacing: ${node.letterSpacing.value / 100}em;\n`;
      }
    }
    
    if (node.textAlignHorizontal.toLowerCase() !== 'left') {
      css += `  text-align: ${node.textAlignHorizontal.toLowerCase()};\n`;
    }
    
    if (node.textCase && node.textCase !== 'ORIGINAL') {
      const textTransform = {
        'UPPER': 'uppercase',
        'LOWER': 'lowercase',
        'TITLE': 'capitalize'
      };
      if (textTransform[node.textCase]) {
        css += `  text-transform: ${textTransform[node.textCase]};\n`;
      }
    }
    
    if (node.fills !== figma.mixed && Array.isArray(node.fills) && node.fills.length > 0) {
      const fill = node.fills[0];
      if (fill.type === 'SOLID') {
        const color = rgbaToString(fill.color.r, fill.color.g, fill.color.b, fill.opacity || 1);
        css += `  color: ${color};\n`;
      }
    }
  }

  if (node.type !== 'TEXT' && 'fills' in node && node.fills !== figma.mixed && Array.isArray(node.fills) && node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill.type === 'SOLID') {
      const bgColor = rgbaToString(fill.color.r, fill.color.g, fill.color.b, fill.opacity || 1);
      css += `  background-color: ${bgColor};\n`;
    } else if (fill.type === 'GRADIENT_LINEAR') {
      css += `  /* gradient background (not fully converted) */\n`;
    }
  }

  if ('cornerRadius' in node && typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
    css += `  border-radius: ${node.cornerRadius}px;\n`;
  } else if ('topLeftRadius' in node) {
    const tl = node.topLeftRadius || 0;
    const tr = node.topRightRadius || 0;
    const br = node.bottomRightRadius || 0;
    const bl = node.bottomLeftRadius || 0;
    if (tl || tr || br || bl) {
      css += `  border-radius: ${tl}px ${tr}px ${br}px ${bl}px;\n`;
    }
  }

  if ('strokes' in node && node.strokes !== figma.mixed && Array.isArray(node.strokes) && node.strokes.length > 0) {
    const stroke = node.strokes[0];
    if (stroke.type === 'SOLID' && 'strokeWeight' in node) {
      const strokeColor = rgbaToString(stroke.color.r, stroke.color.g, stroke.color.b, stroke.opacity || 1);
      const strokeWeight = typeof node.strokeWeight === 'number' ? node.strokeWeight : 1;
      css += `  border: ${strokeWeight}px solid ${strokeColor};\n`;
    }
  }

  if ('opacity' in node && node.opacity !== undefined && node.opacity < 1) {
    css += `  opacity: ${node.opacity.toFixed(2)};\n`;
  }

  if ('effects' in node && Array.isArray(node.effects) && node.effects.length > 0) {
    const shadows = [];
    node.effects.forEach(effect => {
      if (effect.visible && effect.type === 'DROP_SHADOW') {
        const color = rgbaToString(effect.color.r, effect.color.g, effect.color.b, effect.color.a);
        shadows.push(`${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${color}`);
      } else if (effect.visible && effect.type === 'INNER_SHADOW') {
        const color = rgbaToString(effect.color.r, effect.color.g, effect.color.b, effect.color.a);
        shadows.push(`inset ${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${color}`);
      }
    });
    if (shadows.length > 0) {
      css += `  box-shadow: ${shadows.join(', ')};\n`;
    }
  }

  if ('paddingLeft' in node || 'paddingTop' in node) {
    const pl = node.paddingLeft || 0;
    const pr = node.paddingRight || 0;
    const pt = node.paddingTop || 0;
    const pb = node.paddingBottom || 0;
    if (pl === pr && pt === pb && pl === pt) {
      if (pl > 0) css += `  padding: ${pl}px;\n`;
    } else if (pl === pr && pt === pb) {
      css += `  padding: ${pt}px ${pl}px;\n`;
    } else {
      css += `  padding: ${pt}px ${pr}px ${pb}px ${pl}px;\n`;
    }
  }

  if ('layoutMode' in node && node.layoutMode !== 'NONE') {
    css += `  display: flex;\n`;
    css += `  flex-direction: ${node.layoutMode === 'HORIZONTAL' ? 'row' : 'column'};\n`;
    
    if ('primaryAxisAlignItems' in node) {
      const justify = node.primaryAxisAlignItems === 'MIN' ? 'flex-start' :
                      node.primaryAxisAlignItems === 'MAX' ? 'flex-end' :
                      node.primaryAxisAlignItems === 'CENTER' ? 'center' :
                      node.primaryAxisAlignItems === 'SPACE_BETWEEN' ? 'space-between' : 'flex-start';
      css += `  justify-content: ${justify};\n`;
    }
    
    if ('counterAxisAlignItems' in node) {
      const align = node.counterAxisAlignItems === 'MIN' ? 'flex-start' :
                    node.counterAxisAlignItems === 'MAX' ? 'flex-end' :
                    node.counterAxisAlignItems === 'CENTER' ? 'center' : 'stretch';
      css += `  align-items: ${align};\n`;
    }
    
    if ('itemSpacing' in node && node.itemSpacing > 0) {
      css += `  gap: ${node.itemSpacing}px;\n`;
    }
  }

  css += `}`;
  return css;
}

function handleSelectionChange() {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'no-selection'
    });
  } else if (selection.length === 1) {
    const node = selection[0];
    const css = extractStyles(node);
    figma.ui.postMessage({
      type: 'styles',
      css: css,
      nodeName: node.name
    });
  } else if (selection.length === 2) {
    const node1 = selection[0];
    const node2 = selection[1];

    const bounds1 = {
      x: node1.absoluteTransform[0][2],
      y: node1.absoluteTransform[1][2],
      width: node1.width,
      height: node1.height
    };

    const bounds2 = {
      x: node2.absoluteTransform[0][2],
      y: node2.absoluteTransform[1][2],
      width: node2.width,
      height: node2.height
    };

    function isInside(inner, outer) {
      return (
        inner.x >= outer.x &&
        inner.y >= outer.y &&
        (inner.x + inner.width) <= (outer.x + outer.width) &&
        (inner.y + inner.height) <= (outer.y + outer.height)
      );
    }

    let parent = null, child = null, parentName = '', childName = '';

    if (isInside(bounds2, bounds1)) {
      parent = bounds1; child = bounds2;
      parentName = node1.name; childName = node2.name;
    } else if (isInside(bounds1, bounds2)) {
      parent = bounds2; child = bounds1;
      parentName = node2.name; childName = node1.name;
    }

    if (parent && child) {
      const paddingTop = Math.round(child.y - parent.y);
      const paddingLeft = Math.round(child.x - parent.x);
      const paddingBottom = Math.round((parent.y + parent.height) - (child.y + child.height));
      const paddingRight = Math.round((parent.x + parent.width) - (child.x + child.width));

      figma.ui.postMessage({
        type: 'padding-info',
        parentName,
        childName,
        top: paddingTop,
        right: paddingRight,
        bottom: paddingBottom,
        left: paddingLeft
      });
    } else {
      const leftNode = bounds1.x < bounds2.x ? bounds1 : bounds2;
      const rightNode = bounds1.x < bounds2.x ? bounds2 : bounds1;
      const gapX = Math.round(rightNode.x - (leftNode.x + leftNode.width));

      const topNode = bounds1.y < bounds2.y ? bounds1 : bounds2;
      const bottomNode = bounds1.y < bounds2.y ? bounds2 : bounds1;
      const gapY = Math.round(bottomNode.y - (topNode.y + topNode.height));

      const parentName = (node1.parent && node1.parent === node2.parent && node1.parent.name)
        ? node1.parent.name : null;

      figma.ui.postMessage({
        type: 'gap-info',
        node1Name: node1.name,
        node2Name: node2.name,
        gapX: Math.max(gapX, 0),
        gapY: Math.max(gapY, 0),
        parentName: parentName
      });
    }
  } else {
    const node = selection[0];
    const css = extractStyles(node);
    figma.ui.postMessage({
      type: 'styles',
      css: css,
      nodeName: node.name,
      multipleSelected: true,
      count: selection.length
    });
  }
}

handleSelectionChange();

figma.on('selectionchange', handleSelectionChange);
