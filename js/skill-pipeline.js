import { txt } from './i18n.js';

/** @type {ResizeObserver|null} */
let resizeObserver = null;

/** @type {IntersectionObserver|null} */
let revealObserver = null;

/**
 * @param {object} group
 * @param {number} groupIndex
 * @param {import('./i18n.js').Locale} locale
 * @param {boolean} [isOutput]
 */
function renderTagGroup(group, groupIndex, locale, isOutput = false) {
  const themeClass = group.theme ? ` skill-tag-group--${group.theme}` : '';
  const outputClass = isOutput ? ' skill-tag-group--output' : '';
  const leavesHtml = (group.nodes || [])
    .map(
      (node, nodeIndex) => `
      <li class="skill-node skill-node--leaf${group.theme ? ` skill-node--theme-${group.theme}` : ''}"
          style="--leaf-i: ${nodeIndex}; --group-i: ${groupIndex}">
        <span class="skill-node__dot" aria-hidden="true"></span>
        <span class="skill-node__label text-label-01">${txt(node.label, locale)}</span>
      </li>`
    )
    .join('');

  const groupTitle = group.groupTitle ? txt(group.groupTitle, locale) : '';

  return `
    <article class="skill-tag-group${themeClass}${outputClass}" data-group="${group.id}" style="--group-i: ${groupIndex}">
      <header class="skill-tag-group__header">
        <h3 class="skill-tag-group__hub text-label-01">${txt(group.label, locale)}</h3>
        ${groupTitle ? `<p class="skill-tag-group__title text-label-01">${groupTitle}</p>` : ''}
      </header>
      <ul class="skill-tag-group__tags" role="list">${leavesHtml}</ul>
    </article>`;
}

/**
 * @param {object} pipeline
 * @param {import('./i18n.js').Locale} locale
 */
export function renderSkillPipeline(pipeline, locale) {
  const section = document.getElementById('skills');
  const title = document.getElementById('skills-title');
  const subtitle = document.getElementById('skills-subtitle');
  const container = document.getElementById('skill-pipeline');
  if (!section || !container || !pipeline?.zones?.length) {
    section?.setAttribute('hidden', '');
    return;
  }

  section.removeAttribute('hidden');
  if (title) title.textContent = txt(pipeline.title, locale);
  if (subtitle) subtitle.textContent = txt(pipeline.subtitle, locale);

  let groupIndex = 0;

  const zonesHtml = pipeline.zones
    .map((zone, zoneIndex) => {
      if (zone.id === 'gate') {
        const gateTags = (zone.nodes || [])
          .map(
            (node, nodeIndex) => `
          <li class="skill-gate__tag text-label-01"
              style="--leaf-i: ${nodeIndex}; --zone-i: ${zoneIndex}">
            <span class="skill-gate__tag-dot" aria-hidden="true"></span>
            ${txt(node.label, locale)}
          </li>`
          )
          .join('');

        return `
        <div class="skill-hourglass__zone skill-hourglass__zone--gate" data-zone="gate" style="--zone-i: ${zoneIndex}">
          <p class="skill-hourglass__zone-label text-heading-03">${txt(zone.label, locale)}</p>
          <div class="skill-gate" data-zone="gate">
            ${zone.groupTitle ? `<p class="skill-gate__title text-label-01">${txt(zone.groupTitle, locale)}</p>` : ''}
            <ul class="skill-gate__tags" role="list">${gateTags}</ul>
          </div>
        </div>`;
      }

      const isOutput = zone.id === 'output';
      const groupsHtml = (zone.groups || [])
        .map((group) => {
          const html = renderTagGroup(group, groupIndex, locale, isOutput);
          groupIndex += 1;
          return html;
        })
        .join('');

      const zoneModifier = zone.id === 'input' ? 'input' : 'output';

      return `
      <div class="skill-hourglass__zone skill-hourglass__zone--${zoneModifier}" data-zone="${zone.id}" style="--zone-i: ${zoneIndex}">
        <p class="skill-hourglass__zone-label text-heading-03">${txt(zone.label, locale)}</p>
        <div class="skill-hourglass__groups skill-hourglass__groups--${zoneModifier}">
          ${groupsHtml}
        </div>
      </div>`;
    })
    .join('');

  container.innerHTML = `
    <div class="skill-hourglass" id="skill-hourglass-viz">
      <svg class="skill-hourglass__overlay" aria-hidden="true">
        <g class="skill-hourglass__connectors"></g>
        <g class="skill-hourglass__connector-packets"></g>
      </svg>
      <div class="skill-hourglass__content">
        ${zonesHtml}
      </div>
    </div>`;

  initSkillHourglass(container.querySelector('#skill-hourglass-viz'));
}

/**
 * @param {DOMRect} vizRect
 * @param {HTMLElement} el
 */
function bottomCenter(vizRect, el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2 - vizRect.left, y: r.bottom - vizRect.top };
}

/**
 * @param {DOMRect} vizRect
 * @param {HTMLElement} el
 */
function topCenter(vizRect, el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2 - vizRect.left, y: r.top - vizRect.top };
}

/**
 * @param {number} x1 @param {number} y1 @param {number} x2 @param {number} y2
 */
function connectorPath(x1, y1, x2, y2) {
  const midY = y1 + (y2 - y1) * 0.55;
  const cp2X = x1 + (x2 - x1) * 0.75;
  return `M ${x1} ${y1} C ${x1} ${midY}, ${cp2X} ${midY}, ${x2} ${y2}`;
}

/**
 * @param {'left'|'right'} side
 * @param {number} startX @param {number} startY @param {number} endX @param {number} endY
 * @param {number} vizWidth
 */
function returnPath(side, startX, startY, endX, endY, vizWidth) {
  const bulgeX = side === 'left' ? -vizWidth * 0.08 : vizWidth * 1.08;
  const quarter = (endY - startY) * 0.28;
  return `M ${startX} ${startY} C ${bulgeX} ${startY + quarter}, ${bulgeX} ${endY - quarter}, ${endX} ${endY}`;
}

/**
 * @param {SVGElement} overlay
 * @param {{ fromY: number, toY: number }|null} fadeY
 */
function updateReturnGradient(overlay, fadeY) {
  let defs = overlay.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    overlay.insertBefore(defs, overlay.firstChild);
  }

  if (!fadeY) {
    defs.innerHTML = '';
    return;
  }

  const { fromY, toY } = fadeY;
  defs.innerHTML = `
    <linearGradient id="skill-return-fade" gradientUnits="userSpaceOnUse"
                    x1="0" y1="${fromY}" x2="0" y2="${toY}">
      <stop offset="0%" stop-color="#8a3ffc" stop-opacity="0" />
      <stop offset="10%" stop-color="#8a3ffc" stop-opacity="0.65" />
      <stop offset="90%" stop-color="#8a3ffc" stop-opacity="0.65" />
      <stop offset="100%" stop-color="#8a3ffc" stop-opacity="0" />
    </linearGradient>`;
}

/** @param {HTMLElement} viz */
function drawZoneConnectors(viz) {
  const overlay = viz.querySelector('.skill-hourglass__overlay');
  const group = viz.querySelector('.skill-hourglass__connectors');
  const gate = viz.querySelector('.skill-gate');
  if (!overlay || !group || !gate) return;

  const vizRect = viz.getBoundingClientRect();
  if (vizRect.width < 1) return;

  overlay.setAttribute('width', String(vizRect.width));
  overlay.setAttribute('height', String(vizRect.height));
  overlay.setAttribute('viewBox', `0 0 ${vizRect.width} ${vizRect.height}`);

  const gateTop = topCenter(vizRect, gate);
  const gateBottom = bottomCenter(vizRect, gate);
  const paths = [];

  const gateGap = 12;
  const cardGap = 14;

  viz.querySelectorAll('.skill-hourglass__zone--input .skill-tag-group').forEach((card, i) => {
    const from = bottomCenter(vizRect, card);
    paths.push({
      d: connectorPath(from.x, from.y + cardGap, gateTop.x, gateTop.y - gateGap),
      kind: 'input',
      delay: i * 0.08,
    });
  });

  viz.querySelectorAll('.skill-hourglass__zone--output .skill-tag-group').forEach((card, i) => {
    const to = topCenter(vizRect, card);
    paths.push({
      d: connectorPath(gateBottom.x, gateBottom.y + gateGap, to.x, to.y - cardGap),
      kind: 'output',
      delay: 0.2 + i * 0.08,
    });
  });

  const outputGroups = viz.querySelector('.skill-hourglass__groups--output');
  const inputGroups = viz.querySelector('.skill-hourglass__groups--input');
  let returnFadeY = null;

  if (outputGroups && inputGroups) {
    const outRect = outputGroups.getBoundingClientRect();
    const inRect = inputGroups.getBoundingClientRect();
    const fromY = outRect.bottom - vizRect.top + 20;
    const toY = inRect.top - vizRect.top - 16;
    returnFadeY = { fromY, toY };
    const leftX = Math.max(16, vizRect.width * 0.05);
    const rightX = vizRect.width - leftX;

    paths.push({
      d: returnPath('left', leftX, fromY, leftX + 8, toY, vizRect.width),
      kind: 'return',
      delay: 0.4,
    });
    paths.push({
      d: returnPath('right', rightX, fromY, rightX - 8, toY, vizRect.width),
      kind: 'return',
      delay: 0.55,
    });
  }

  updateReturnGradient(overlay, returnFadeY);

  group.innerHTML = paths
    .map(
      (p, i) => `
    <path class="skill-hourglass__connector skill-hourglass__connector--${p.kind}"
          pathLength="1"
          data-connector-i="${i}"
          d="${p.d}"
          style="--connector-delay: ${p.delay}s" />`
    )
    .join('');
}

/** @param {HTMLElement} viz */
function spawnPackets(viz) {
  if (!viz.classList.contains('skill-hourglass--active')) return;
  const connectorPackets = viz.querySelector('.skill-hourglass__connector-packets');
  if (!connectorPackets) return;

  const connectors = viz.querySelectorAll('.skill-hourglass__connector');
  connectorPackets.innerHTML = [...connectors]
    .flatMap((path, i) => {
      const isReturn = path.classList.contains('skill-hourglass__connector--return');
      if (isReturn) return [];

      const d = path.getAttribute('d');
      const isOutput = path.classList.contains('skill-hourglass__connector--output');
      return [0, 1.4].map((offset) => ({
        d,
        delay: 0.5 + i * 0.3 + offset,
        purple: isOutput,
        r: 3.5,
      }));
    })
    .map(
      (p) => `
    <circle class="skill-hourglass__packet${p.purple ? ' skill-hourglass__packet--purple' : ''}"
            r="${p.r}" style="--packet-delay: ${p.delay}s">
      <animateMotion dur="2.4s" repeatCount="indefinite" begin="${p.delay}s"
                     path="${p.d}" calcMode="linear" />
    </circle>`
    )
    .join('');
}

/** @param {HTMLElement|null} viz */
function initSkillHourglass(viz) {
  if (!viz) return;

  revealObserver?.disconnect();
  resizeObserver?.disconnect();

  const redraw = () => {
    drawZoneConnectors(viz);
    spawnPackets(viz);
  };

  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(redraw);
    resizeObserver.observe(viz);
  } else {
    window.addEventListener('resize', redraw);
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        viz.classList.toggle('skill-hourglass--active', entry.isIntersecting);
        if (entry.isIntersecting) requestAnimationFrame(redraw);
      });
    },
    { threshold: 0.15 }
  );
  revealObserver.observe(viz);

  requestAnimationFrame(redraw);
}

export function destroySkillPipeline() {
  revealObserver?.disconnect();
  resizeObserver?.disconnect();
  revealObserver = null;
  resizeObserver = null;
}
