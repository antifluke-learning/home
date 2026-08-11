import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://trptvhldgalmthfbiahe.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_pLfBjU5VCOPsPUHB-lMXmg_9D_EqNAH';
const WHATSAPP_URL = 'https://wa.me/50238719307';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .ag-box{max-width:420px;margin:0 auto;padding:2rem;border-radius:16px;background:var(--card,#fff);border:1px solid var(--border,rgba(123,97,255,.14));text-align:center;font-family:'Inter',sans-serif}
    .ag-box h3{font-family:'Space Grotesk',sans-serif;color:var(--text-heading,#0B1020);font-size:1.15rem;margin-bottom:.6rem}
    .ag-box p{color:var(--gray-mid,#5a5f72);font-size:.92rem;line-height:1.55;margin-bottom:1.2rem}
    .ag-input{width:100%;padding:.75rem 1rem;border-radius:8px;border:1px solid var(--border2,rgba(123,97,255,.24));background:var(--midnight2,#F0F2F8);color:var(--text-heading,#0B1020);font-size:.95rem;margin-bottom:.9rem;font-family:inherit}
    .ag-btn{width:100%;padding:.8rem 1rem;border-radius:8px;border:none;background:var(--violet,#7B61FF);color:#fff;font-weight:600;font-size:.95rem;cursor:pointer;font-family:inherit;transition:background .2s}
    .ag-btn:hover{background:var(--violet2,#6448f0)}
    .ag-btn:disabled{opacity:.6;cursor:default}
    .ag-btn-secondary{display:inline-block;margin-top:.6rem;padding:.7rem 1.3rem;border-radius:8px;border:1px solid var(--border2,rgba(123,97,255,.24));color:var(--text-heading,#0B1020);text-decoration:none;font-size:.9rem;font-weight:600}
    .ag-error{color:#e05252;font-size:.85rem;margin-top:.6rem}
    .ag-video-wrap{max-width:960px;margin:0 auto}
    .ag-video-frame{position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;background:#000}
    .ag-video-frame iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0}
    .ag-spinner{width:28px;height:28px;border:3px solid var(--border,rgba(123,97,255,.2));border-top-color:var(--violet,#7B61FF);border-radius:50%;margin:0 auto;animation:ag-spin .7s linear infinite}
    @keyframes ag-spin{to{transform:rotate(360deg)}}
  `;
  document.head.appendChild(style);
}

function renderLoading(el) {
  el.innerHTML = `<div class="ag-box"><div class="ag-spinner"></div></div>`;
}

function renderLoginForm(el, programa) {
  el.innerHTML = `
    <div class="ag-box">
      <h3>Accede a tu clase</h3>
      <p>Ingresa el correo con el que te inscribiste. Te enviaremos un enlace de acceso.</p>
      <form id="ag-login-form">
        <input type="email" class="ag-input" id="ag-email" placeholder="tu@correo.com" required autocomplete="email">
        <button type="submit" class="ag-btn" id="ag-submit">Enviar enlace de acceso</button>
      </form>
      <div id="ag-msg"></div>
    </div>
  `;
  const form = el.querySelector('#ag-login-form');
  const submitBtn = el.querySelector('#ag-submit');
  const msg = el.querySelector('#ag-msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = el.querySelector('#ag-email').value.trim();
    if (!email) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    msg.innerHTML = '';

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });

    if (error) {
      msg.innerHTML = `<p class="ag-error">No pudimos enviar el enlace. Intenta de nuevo en unos minutos.</p>`;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar enlace de acceso';
      return;
    }

    el.innerHTML = `
      <div class="ag-box">
        <h3>Revisa tu correo</h3>
        <p>Te enviamos un enlace de acceso a <strong>${escapeHtml(email)}</strong>. Ábrelo desde este mismo dispositivo para entrar a tu clase.</p>
      </div>
    `;
  });
}

function renderNoAccess(el) {
  el.innerHTML = `
    <div class="ag-box">
      <h3>No encontramos tu inscripción</h3>
      <p>No tenemos un registro de pago para este programa asociado a tu correo. Si crees que esto es un error, escríbenos y lo resolvemos.</p>
      <a href="${WHATSAPP_URL}" target="_blank" rel="noopener" class="ag-btn-secondary">Contáctanos por WhatsApp</a>
    </div>
  `;
}

function renderError(el) {
  el.innerHTML = `
    <div class="ag-box">
      <h3>Algo salió mal</h3>
      <p>No pudimos verificar tu acceso en este momento. Intenta recargar la página en unos minutos.</p>
      <a href="${WHATSAPP_URL}" target="_blank" rel="noopener" class="ag-btn-secondary">Contáctanos por WhatsApp</a>
    </div>
  `;
}

function renderVideo(el, youtubeVideoId) {
  el.innerHTML = `
    <div class="ag-video-wrap">
      <div class="ag-video-frame">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeVideoId)}"
          title="Clase grabada"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function checkAccessAndRender(el, programa, youtubeVideoId) {
  renderLoading(el);

  const { data: estudiante, error } = await supabase
    .from('estudiantes')
    .select('*')
    .eq('programa', programa)
    .maybeSingle();

  if (error) {
    renderError(el);
    return;
  }

  if (!estudiante) {
    renderNoAccess(el);
    return;
  }

  renderVideo(el, youtubeVideoId);
}

/**
 * Inicializa el gate de acceso a una clase grabada.
 * @param {Object} opts
 * @param {string} opts.programa - Identificador fijo del programa (hardcodeado en la página, nunca de un query param).
 * @param {string} opts.youtubeVideoId - ID del video de YouTube (no listado) de la clase grabada.
 * @param {HTMLElement} opts.mountEl - Elemento donde se renderiza el formulario/video.
 */
export async function initAuthGate({ programa, youtubeVideoId, mountEl }) {
  if (!programa || !youtubeVideoId || !mountEl) {
    throw new Error('initAuthGate requiere programa, youtubeVideoId y mountEl');
  }

  injectStyles();
  renderLoading(mountEl);

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    renderLoginForm(mountEl, programa);
  } else {
    await checkAccessAndRender(mountEl, programa, youtubeVideoId);
  }

  supabase.auth.onAuthStateChange(async (event, newSession) => {
    if (event === 'SIGNED_IN' && newSession) {
      await checkAccessAndRender(mountEl, programa, youtubeVideoId);
    } else if (event === 'SIGNED_OUT') {
      renderLoginForm(mountEl, programa);
    }
  });
}
