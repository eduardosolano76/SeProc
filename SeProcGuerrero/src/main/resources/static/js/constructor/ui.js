// ui.js

// Alertas Globales
const customAlert = document.getElementById('customAlert');
const customAlertTitle = document.getElementById('customAlertTitle');
const customAlertMessage = document.getElementById('customAlertMessage');
const customAlertOk = document.getElementById('customAlertOk');
const customAlertCancel = document.getElementById('customAlertCancel');

export function addCacheBuster(url) {
    if (!url) return url;
    return url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
}

export function renderProfilePhoto(url) {
    const profileImg = document.getElementById('profileImg');
    const profileFallback = document.getElementById('profileFallback');

    if (!profileImg || !profileFallback) return;

    if (!url || url.trim() === '') {
        profileImg.style.display = 'none';
        profileFallback.style.display = 'block';
        return;
    }

    profileImg.onload = () => {
        profileImg.style.display = 'block';
        profileFallback.style.display = 'none';
    };

    profileImg.onerror = () => {
        profileImg.style.display = 'none';
        profileFallback.style.display = 'block';
    };

    profileImg.src = addCacheBuster(url);
}

export function closeCustomAlert() {
    customAlert?.classList.remove('open');
    customAlert?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

export function showCustomAlert(message, title = 'Atención') {
    return new Promise((resolve) => {
        customAlertTitle.textContent = title;
        customAlertMessage.textContent = message;
        customAlertCancel.style.display = 'none';

        customAlert.classList.add('open');
        customAlert.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        const handleOk = () => {
            closeCustomAlert();
            customAlertOk.removeEventListener('click', handleOk);
            resolve(true);
        };

        customAlertOk.addEventListener('click', handleOk);
    });
}

export function showCustomConfirm(message, title = 'Confirmar acción') {
    return new Promise((resolve) => {
        customAlertTitle.textContent = title;
        customAlertMessage.textContent = message;
        customAlertCancel.style.display = 'inline-flex';

        customAlert.classList.add('open');
        customAlert.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        const handleOk = () => { cleanup(); resolve(true); };
        const handleCancel = () => { cleanup(); resolve(false); };

        const cleanup = () => {
            closeCustomAlert();
            customAlertOk.removeEventListener('click', handleOk);
            customAlertCancel.removeEventListener('click', handleCancel);
        };

        customAlertOk.addEventListener('click', handleOk);
        customAlertCancel.addEventListener('click', handleCancel);
    });
}

export function openModal(modalEl, backdropEl) {
    modalEl?.classList.add('open');
    backdropEl?.classList.add('open');
    document.body.style.overflow = 'hidden';
}

export function closeModal(modalEl, backdropEl) {
    modalEl?.classList.remove('open');
    backdropEl?.classList.remove('open');
    document.body.style.overflow = '';
}

export function escapeHtml(str) {
    return String(str ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

export function estadoDotClass(estado) {
    const s = (estado || '').toUpperCase();
    if (s === 'ACTIVO') return 'dot-aprobada';
    if (s === 'INACTIVO') return 'dot-pendiente';
    if (s === 'FINALIZADO') return 'dot-rechazada';
    return 'dot-pendiente';
}

export function renderCards(items, onDetailClick) {
    const list = document.getElementById('constructorProjectsList');
    const empty = document.getElementById('constructorProjectsEmpty');
    if (!list || !empty) return;

    list.querySelectorAll('.card-sol').forEach(x => x.remove());

    if (!items || items.length === 0) {
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    for (const it of items) {
        const card = document.createElement('div');
        card.className = 'card-sol';

        const left = document.createElement('div');
        left.className = 'left';

        const school = document.createElement('div');
        school.className = 'school';
        school.textContent = it.nombreEscuela ?? '—';

        const meta = document.createElement('div');
        meta.className = 'meta';

        const dot = document.createElement('span');
        dot.className = `state-dot ${estadoDotClass(it.estadoProyecto)}`;

        const p1 = document.createElement('span');
        p1.textContent = `Supervisor: ${it.supervisor ?? '—'}`;

        const p2 = document.createElement('span');
        p2.textContent = `Fecha: ${it.fechaAprobacion ?? ''}`;

        meta.appendChild(dot);
        meta.appendChild(p1);
        meta.appendChild(p2);
        left.appendChild(school);
        left.appendChild(meta);

        const btn = document.createElement('button');
        btn.className = 'btn-detail';
        btn.type = 'button';
        btn.textContent = 'Ver detalle';
        btn.addEventListener('click', () => onDetailClick(it.idProyecto));

        card.appendChild(left);
        card.appendChild(btn);
        list.appendChild(card);
    }
}

export function renderDetalleProyecto(dto) {
    const badgeEstado = document.getElementById('badgeEstado');
    const detalleMeta = document.getElementById('detalleMeta');
    const detalleBody = document.getElementById('detalleBody');

    if (!badgeEstado || !detalleMeta || !detalleBody) return;

    badgeEstado.textContent = (dto.estadoProyecto || '').toUpperCase();

    detalleMeta.innerHTML = `
    <div>Proyecto #${escapeHtml(dto.idProyecto)} • Solicitud #${escapeHtml(dto.idSolicitud)}</div>
    <div>Fecha de aprobación: ${escapeHtml(dto.fechaAprobacion ?? '')}</div>
    <div>Supervisor asignado: ${escapeHtml(dto.supervisorAsignado ?? '—')}</div>
  `;

    detalleBody.innerHTML = `
    <div class="placeholder-detail">
      <div class="ph-grid">
        <div class="ph-box">
          <div class="ph-label">Escuela</div>
          <div class="ph-value">${escapeHtml(dto.nombreEscuela)}</div>
        </div>
        <div class="ph-box">
          <div class="ph-label">Ubicación</div>
          <div class="ph-value">${escapeHtml(dto.estado)}, ${escapeHtml(dto.municipio)}, ${escapeHtml(dto.ciudad)}</div>
        </div>
        <div class="ph-box">
          <div class="ph-label">Tipo de obra</div>
          <div class="ph-value">${escapeHtml(dto.tipoObra)}</div>
        </div>
        <div class="ph-box">
          <div class="ph-label">Tipo de edificación</div>
          <div class="ph-value">${escapeHtml(dto.tipoEdificacion ?? '')}</div>
        </div>
      </div>
      <div class="ph-note">aqui después para subir evidencias</div>
    </div>
  `;
}

function normalizarEstadoEtapa(estado) {
    return String(estado || 'BLOQUEADA').trim().toUpperCase();
}

function resolverEstado(dto, clave) {
    return normalizarEstadoEtapa(dto?.estadosEtapa?.[clave]);
}

function claseVisualDesdeEstado(estado) {
    const e = normalizarEstadoEtapa(estado);

    if (e === 'COMPLETADA') return 'done';
    if (e === 'EN_PROCESO' || e === 'CON_OBSERVACIONES') return 'current';
    return 'locked';
}

function iconoVisualDesdeEstado(estado) {
    const e = normalizarEstadoEtapa(estado);

    if (e === 'COMPLETADA') return '/assets/iconos/listo.png';
    if (e === 'EN_PROCESO' || e === 'CON_OBSERVACIONES') return '/assets/iconos/proceso.png';
    return '/assets/iconos/bloqueado.png';
}

export function renderProcesoProyecto(dto) {
    const container = document.getElementById('constructorProcesoContent');
    if (!container) return;

    const preliminaresEstado = resolverEstado(dto, 'limpieza_trazo_nivelacion');
    const cimentacionEstado = resolverEstado(dto, 'excavacion');

    const estructuraClaves = [
        'estructura_n1_habilitado_castillos',
        'estructura_n1_habilitado_columnas',
        'estructura_n1_cimbra_verticales',
        'estructura_n1_concreto_verticales'
    ];

    const acabadosClaves = [
        'pisos',
        'guarnicion'
    ];

    const resolverEstadoBloque = (claves) => {
        const estados = claves.map(k => resolverEstado(dto, k));
        if (estados.some(e => e === 'EN_PROCESO' || e === 'CON_OBSERVACIONES')) return 'EN_PROCESO';
        if (estados.some(e => e === 'COMPLETADA')) return 'COMPLETADA';
        return 'BLOQUEADA';
    };

    const estructuraEstado = resolverEstadoBloque(estructuraClaves);
    const acabadosEstado = resolverEstadoBloque(acabadosClaves);

    const cardBtn = (label, bloque, estado) => `
      <button class="process-mini-stage status-${claseVisualDesdeEstado(estado)}" type="button" data-bloque="${bloque}">
        <span class="process-mini-stage-icon">
          <img src="${iconoVisualDesdeEstado(estado)}" alt="">
        </span>
        <span class="process-mini-stage-label">${escapeHtml(label)}</span>
      </button>
    `;

    container.innerHTML = `
      <div class="process-mini-shell">
        <div class="process-mini-top">
          <button class="process-mini-back" id="btnBackProceso" type="button" aria-label="Volver">
            <img src="/assets/iconos/regresar.png" alt="Volver">
          </button>
          <div class="process-mini-chip">PROCESO CONSTRUCTIVO</div>
          <div class="process-mini-spacer"></div>
        </div>

        <div class="process-mini-summary">
          <div class="process-mini-left">
            <div class="process-mini-school">${escapeHtml(dto.nombreEscuela ?? '')}</div>
            <div class="process-mini-meta">Tipo de obra: <span>${escapeHtml(dto.tipoObra ?? '')}</span></div>
            <div class="process-mini-meta">Tipo de edificación: <span>${escapeHtml(dto.tipoEdificacion ?? '')}</span></div>
          </div>

          <div class="process-mini-right">
            <div class="process-mini-progress-label">Avance en %</div>
            <div class="process-mini-track">
              <div class="process-mini-fill" style="width: 25%;"></div>
            </div>
          </div>
        </div>

        <div class="process-mini-list">
          ${cardBtn('Trabajos preliminares', 'preliminares', preliminaresEstado)}
          ${cardBtn('Cimentación', 'cimentacion', cimentacionEstado)}
          ${cardBtn('Estructura', 'estructura', estructuraEstado)}
          ${cardBtn('Albañilería y acabados', 'acabados', acabadosEstado)}
        </div>
      </div>
    `;
}

export function renderBloqueProyecto(dto, bloque) {
    const container = document.getElementById('constructorBloqueContent');
    if (!container) return;

    const iconDone = '/assets/iconos/listo.png';
    const iconCurrent = '/assets/iconos/proceso.png';
    const iconLocked = '/assets/iconos/bloqueado.png';

	const stageBtn = (nombre, etapa) => {
	  const estadoReal = resolverEstado(dto, etapa);
	  const estadoVisual = claseVisualDesdeEstado(estadoReal);
	  const icono = iconoVisualDesdeEstado(estadoReal);

	  return `
	    <button
	      class="process-mini-stage status-${estadoVisual} compact-stage"
	      type="button"
	      data-etapa="${etapa}"
	      data-nombre="${nombre}"
	      data-estado="${estadoVisual}">
	      <span class="process-mini-stage-icon">
	        <img src="${icono}" alt="">
	      </span>
	      <span class="process-mini-stage-label">${escapeHtml(nombre)}</span>
	    </button>
	  `;
	};

	const subBloqueBtn = (nombre, subbloque, estado = 'locked', icono = iconLocked) => `
	  <button class="process-mini-stage status-${estado} compact-stage" type="button" data-subbloque="${subbloque}">
	    <span class="process-mini-stage-icon">
	      <img src="${icono}" alt="">
	    </span>
	    <span class="process-mini-stage-label">${escapeHtml(nombre)}</span>
	  </button>
	`;

    const estructuraNivel = (nivel, incluirOtros) => `
    <div class="structure-accordion">
      <button class="structure-accordion-toggle" type="button">
        <span class="structure-accordion-title">Estructura nivel ${nivel}</span>
        <span class="structure-accordion-arrow">
          <img src="/assets/iconos/abajo.png" alt="">
        </span>
      </button>

      <div class="structure-accordion-body">
        <div class="structure-accordion nested">
          <button class="structure-accordion-toggle" type="button">
            <span class="structure-accordion-title">Elementos verticales</span>
            <span class="structure-accordion-arrow">
              <img src="/assets/iconos/abajo.png" alt="">
            </span>
          </button>

          <div class="structure-accordion-body">
            ${stageBtn('Habilitado de castillos', `estructura_n${nivel}_habilitado_castillos`)}
            ${stageBtn('Habilitado de columnas', `estructura_n${nivel}_habilitado_columnas`)}
            ${subBloqueBtn('Muros', `estructura_n${nivel}_muros`)}
            ${stageBtn('Cimbra', `estructura_n${nivel}_cimbra_verticales`)}
            ${stageBtn('Concreto', `estructura_n${nivel}_concreto_verticales`)}
          </div>
        </div>

        <div class="structure-accordion nested">
          <button class="structure-accordion-toggle" type="button">
            <span class="structure-accordion-title">Elementos horizontales</span>
            <span class="structure-accordion-arrow">
              <img src="/assets/iconos/abajo.png" alt="">
            </span>
          </button>

          <div class="structure-accordion-body">
            ${stageBtn('Habilitado de dalas', `estructura_n${nivel}_habilitado_dalas`)}
            ${stageBtn('Habilitado de vigas / trabes', `estructura_n${nivel}_habilitado_vigas_trabes`)}
            ${stageBtn('Cimbra', `estructura_n${nivel}_cimbra_horizontales`)}
            ${stageBtn('Concreto', `estructura_n${nivel}_concreto_horizontales`)}
            ${stageBtn('Cimbra para losa', `estructura_n${nivel}_cimbra_losa`)}
            ${stageBtn('Habilitado para losa', `estructura_n${nivel}_habilitado_losa`)}
            ${stageBtn('Concreto', `estructura_n${nivel}_concreto_losa`)}
          </div>
        </div> 

        ${incluirOtros ? `
          <div class="structure-accordion nested">
            <button class="structure-accordion-toggle" type="button">
              <span class="structure-accordion-title">Otros elementos de concreto</span>
              <span class="structure-accordion-arrow">
                <img src="/assets/iconos/abajo.png" alt="">
              </span>
            </button>

            <div class="structure-accordion-body">
              ${stageBtn('Habilitado de acero para barandal de concreto', `estructura_n${nivel}_habilitado_barandal_concreto`)}
              ${stageBtn('Cimbra', `estructura_n${nivel}_cimbra_otros_concreto`)}
              ${stageBtn('Concreto', `estructura_n${nivel}_concreto_otros_concreto`)}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;

    let titulo = 'Bloque';
    let html = '';

    if (bloque === 'cimentacion') {
        titulo = 'Cimentación';
        html = `
      <div class="process-mini-list">
        ${stageBtn('Excavación', 'excavacion', 'done', iconDone)}
        ${stageBtn('Plantilla de concreto', 'plantilla_concreto', 'current', iconCurrent)}
        ${subBloqueBtn('Habilitado del acero de refuerzo', 'cimentacion_acero_refuerzo')}
        ${stageBtn('Cimbra y murete de enrase', 'cimbra_murete_enrase')}
        ${stageBtn('Concreto', 'concreto_cimentacion')}
        ${stageBtn('Habilitado de cadenas', 'habilitado_cadenas')}
        ${stageBtn('Relleno', 'relleno')}
      </div>
    `;
    } else if (bloque === 'cimentacion_acero_refuerzo') {
        titulo = 'Habilitado del acero de refuerzo';
        html = `
      <div class="process-mini-list">
        ${stageBtn('Zapata', 'zapata')}
        ${stageBtn('Contratrabe', 'contratrabe')}
        ${stageBtn('Columnas o castillos', 'columnas_castillos_cimentacion')}
      </div>
    `;
    } else if (bloque === 'estructura') {
        titulo = 'Estructura';

        const tipo = (dto.tipoEdificacion ?? '').toUpperCase();
        const niveles = tipo === 'U3C' ? 3 : (tipo === 'U2C' ? 2 : 1);
        const incluirOtros = niveles >= 2;

        html = `
      <div class="structure-list">
        ${estructuraNivel(1, incluirOtros)}
        ${niveles >= 2 ? estructuraNivel(2, true) : ''}
        ${niveles >= 3 ? estructuraNivel(3, true) : ''}
      </div>
    `;
    } else if (bloque.startsWith('estructura_n') && bloque.endsWith('_muros')) {
        const nivel = bloque.match(/estructura_n(\d+)_muros/)?.[1] || '1';
        titulo = `Muros - nivel ${nivel}`;
        html = `
      <div class="process-mini-list">
        ${stageBtn('Habilitado de muros de concreto', `estructura_n${nivel}_habilitado_muros_concreto`)}
        ${subBloqueBtn('Mampostería', `estructura_n${nivel}_mamposteria`)}
      </div>
    `;
    } else if (bloque.startsWith('estructura_n') && bloque.endsWith('_mamposteria')) {
        const nivel = bloque.match(/estructura_n(\d+)_mamposteria/)?.[1] || '1';
        titulo = `Mampostería - nivel ${nivel}`;
        html = `
      <div class="process-mini-list">
        ${stageBtn('Habilitado de cadenas intermedias', `estructura_n${nivel}_habilitado_cadenas_intermedias`)}
      </div>
    `;
    } else if (bloque === 'preliminares') {
        titulo = 'Trabajos preliminares';
        html = `
      <div class="process-mini-list">
        ${stageBtn('Limpieza, trazo y nivelación', 'limpieza_trazo_nivelacion', 'done', iconDone)}
      </div>
    `;
    } else if (bloque === 'acabados') {
        titulo = 'Albañilería y acabados';
        html = `
      <div class="process-mini-list">
        ${stageBtn('Pisos', 'pisos')}
        ${stageBtn('Guarnición', 'guarnicion')}
      </div>
    `;
    }

    container.innerHTML = `
    <div class="process-mini-shell">
      <div class="process-mini-top">
        <button class="process-mini-back" id="btnBackBloque" type="button" aria-label="Volver">
          <img src="/assets/iconos/regresar.png" alt="Volver">
        </button>
        <div class="process-mini-chip">${escapeHtml(titulo)}</div>
        <div class="process-mini-spacer"></div>
      </div>

      ${html}
    </div>
  `;
}

export function renderEtapaProyecto(dtoProceso, etapaKey, etapaNombre, detalleEtapa) {
    const container = document.getElementById('constructorEtapaContent');
    if (!container) return;

    const relojIcon = '/assets/iconos/historial.png';
    const titulo = etapaNombre || 'Etapa';

    const observacion = detalleEtapa?.ultimaObservacion;
    const entrega = detalleEtapa?.entregaActual;

    container.innerHTML = `
        <div class="etapa-mini-shell">
          <div class="etapa-mini-top">
            <button class="process-mini-back" id="btnBackEtapa" type="button" aria-label="Volver">
              <img src="/assets/iconos/regresar.png" alt="Volver">
            </button>
            <div class="process-mini-chip">${escapeHtml(titulo.toUpperCase())}</div>
            <button class="etapa-mini-history" id="btnHistoryEtapa" type="button" title="Historial">
              <img src="${relojIcon}" alt="Historial">
            </button>
          </div>

          <div class="etapa-mini-grid">
            <div class="etapa-card etapa-card-observaciones">
              <div class="etapa-card-title">Observaciones del supervisor</div>

              ${
                  observacion
                  ? `
                    <div class="historial-card-body">
                      <div class="historial-user">${escapeHtml(observacion.usuarioNombre || '—')}</div>
                      <div class="historial-date">${escapeHtml(observacion.fecha || '')}</div>
                      <div class="historial-text">${escapeHtml(observacion.mensaje || '')}</div>
                    </div>
                  `
                  : `
                    <div class="etapa-empty">
                      Aún no hay observaciones para esta etapa.
                    </div>
                  `
              }
            </div>

            <div class="etapa-card etapa-card-entrega">
              <div class="etapa-card-title">Tu trabajo</div>

              ${
                  entrega
                  ? `
                    <div class="historial-card-body" style="margin-bottom:14px;">
                      <div class="historial-user">${escapeHtml(entrega.usuarioNombre || '—')}</div>
                      <div class="historial-date">${escapeHtml(entrega.fechaSubida || '')}</div>
                      <div class="historial-text"><strong>Versión:</strong> ${escapeHtml(entrega.version ?? '')}</div>
                      <div class="historial-text"><strong>Estado:</strong> ${escapeHtml(entrega.estadoEntrega || '')}</div>
                      ${
						entrega.archivoUrl
						    ? `<div class="historial-file">
						         <a href="${entrega.archivoUrl}" target="_blank">
						            ${escapeHtml(entrega.nombreArchivo || 'Ver archivo actual')}
						         </a>
						       </div>`
						    : ''
                      }
                    </div>
                  `
                  : ''
              }

              <div id="enlaceReporte_${etapaKey}" style="text-align: center; margin-bottom: 12px;"></div>

			  ${(entrega?.estadoEntrega === 'ENVIADA' || entrega?.estadoEntrega === 'APROBADA') ? `
			                    <div style="text-align: center; padding: 15px; background: #f0f4f8; border-radius: 8px; color: #4a5568; font-size: 0.95rem;">
			                        <strong style="display: block; margin-bottom: 5px;">
			                            ${entrega?.estadoEntrega === 'ENVIADA' ? 'En revisión' : 'Etapa Aprobada'}
			                        </strong>
			                        ${entrega?.estadoEntrega === 'ENVIADA' 
			                            ? 'Has enviado el reporte. Espera la evaluación de tu supervisor.' 
			                            : 'Este reporte ya fue evaluado y aprobado. No se requieren más acciones.'}
			                    </div>
			                ` : `
			                    <div class="etapa-upload-actions">
			                       <input type="file" id="reporteFile_${etapaKey}" accept="application/pdf" hidden>
			                       
			                       <button class="etapa-btn-upload" id="btnUploadReporte_${etapaKey}" type="button">
			                          ${entrega?.estadoEntrega === 'BORRADOR' 
			                              ? 'Reemplazar borrador' 
			                              : (entrega?.estadoEntrega === 'CON_OBSERVACIONES' ? 'Subir corrección' : '+ Agregar reporte')}
			                       </button>
			                       
			                       ${entrega?.estadoEntrega === 'BORRADOR' ? `
			                          <button class="etapa-btn-send" id="btnSendReporte_${etapaKey}" type="button">Entregar</button>
			                       ` : ''}
			                    </div>
			                `}
			              </div>
			            </div>

          <div class="etapa-upload-panel">
            <div class="etapa-upload-placeholder">
              Aquí después irá la carga de PDF y la vista del archivo seleccionado
            </div>
          </div>
        </div>
    `;
}
export function fillSelect(selectEl, items, placeholder = 'Seleccionar') {
    selectEl.innerHTML = `<option value="" disabled selected>${placeholder}</option>`;
    for (const it of items) {
        const opt = document.createElement('option');
        opt.value = it.id;
        opt.textContent = it.nombre;
        selectEl.appendChild(opt);
    }
}

export function setActiveNav(navId) {
    document.querySelectorAll('.sidebar a.nav-item').forEach(el => el.classList.remove('active'));
    const item = document.getElementById(navId);
    if (item) item.classList.add('active');
}

export function syncSidebarWithUrl(view) {
    if (view === 'password') {
        setActiveNav('navPassword');
    } else {
        setActiveNav('navProyectos');
    }
}

// Menú desplegable de la foto de perfil
const profileMenuDropdown = document.getElementById('profileMenuDropdown');

export function closeProfileMenu() {
    profileMenuDropdown?.classList.remove('open');
}

export function toggleProfileMenu() {
    profileMenuDropdown?.classList.toggle('open');
}

// Escuchar clics en todo el documento para cerrar el menú
document.addEventListener('click', (e) => {
    if (profileMenuDropdown?.classList.contains('open') && !e.target.closest('.userbox')) {
        closeProfileMenu();
    }
});

export function renderHistorialProyecto(historial) {
  const container = document.getElementById('constructorHistorialContent');
  if (!container) return;

  container.innerHTML = `
    <div class="historial-mini-shell">
      <div class="historial-mini-top">
        <button class="process-mini-back" id="btnBackHistorial" type="button" aria-label="Volver">
          <img src="/assets/iconos/regresar.png" alt="Volver">
        </button>
        <div class="process-mini-chip">HISTORIAL</div>
        <div class="process-mini-spacer"></div>
      </div>

      <div class="historial-mini-list">
        ${
            historial && historial.length
            ? historial.map(item => `
              <div class="historial-pair">
                <div class="historial-row">
                  <div class="historial-card" style="grid-column:1 / -1;">
                    <div class="etapa-card-title">${escapeHtml(item.tipo || '')}</div>
                    <div class="historial-card-body">
                      <div class="historial-user">${escapeHtml(item.usuarioNombre || '—')}</div>
                      <div class="historial-date">${escapeHtml(item.fecha || '')}</div>
                      ${
                          item.mensaje
                          ? `<div class="historial-text">${escapeHtml(item.mensaje)}</div>`
                          : ''
                      }
                      ${
                          item.version != null
                          ? `<div class="historial-text"><strong>Versión:</strong> ${escapeHtml(item.version)}</div>`
                          : ''
                      }
                      ${
                          item.estadoEntrega
                          ? `<div class="historial-text"><strong>Estado:</strong> ${escapeHtml(item.estadoEntrega)}</div>`
                          : ''
                      }
                      ${
                          item.archivoUrl
                          ? `<div class="historial-file"><a href="${item.archivoUrl}" target="_blank">${escapeHtml(item.nombreArchivo || 'Ver archivo')}</a></div>`
                          : ''
                      }
                    </div>
                  </div>
                </div>
              </div>
            `).join('')
            : `
              <div class="historial-pair">
                <div class="historial-card" style="grid-column:1 / -1;">
                  <div class="etapa-empty">Aún no hay historial para esta etapa.</div>
                </div>
              </div>
            `
        }
      </div>
    </div>
  `;
}