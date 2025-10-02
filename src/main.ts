import './style.css'

/** ====== Iconos SVG (inline) ====== **/
const IconBrush = `
<svg class="icon-big" viewBox="0 0 24 24" fill="none">
  <path d="M14.5 3l6.5 6.5-7.8 7.8c-1.2 1.2-3.1 1.2-4.3 0-.5-.5-.8-1.1-.9-1.8-.1-.7-.4-1.3-.9-1.8-.5-.5-1.1-.8-1.8-.9-.7-.1-1.3-.4-1.8-.9-1.2-1.2-1.2-3.1 0-4.3L14.5 3z" stroke="currentColor" stroke-width="1.5"/>
</svg>`;
const IconSparkle = `
<svg class="icon" viewBox="0 0 24 24" fill="none">
  <path d="M12 3l1.6 3.6L17 8.2l-3.4 1.6L12 13l-1.6-3.2L7 8.2l3.4-1.6L12 3z" stroke="currentColor" stroke-width="1.4"/>
  <path d="M19 14l.9 2l2 .9l-2 .9l-.9 2l-.9-2l-2-.9l2-.9l.9-2zM4 14l.8 1.8l1.8.8l-1.8.8L4 19l-.8-1.8L1.4 16l1.8-.8L4 14z" fill="currentColor"/>
</svg>`;
const IconFace = `
<svg class="icon-big" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
  <path d="M8 13c1.3 1 2.7 1.5 4 1.5s2.7-.5 4-1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/>
</svg>`;
const IconNail = `
<svg class="icon-big" viewBox="0 0 24 24" fill="none">
  <path d="M8 3h8l1 4H7l1-4z" stroke="currentColor" stroke-width="1.5" />
  <rect x="7" y="7" width="10" height="12" rx="3" stroke="currentColor" stroke-width="1.5"/>
</svg>`;
const IconLotus = `
<svg class="icon-big" viewBox="0 0 24 24" fill="none">
  <path d="M12 4c1.8 2.2 2.7 4.3 2.7 6.3S13.8 14.2 12 16c-1.8-1.8-2.7-3.9-2.7-5.7S10.2 6.2 12 4z" stroke="currentColor" stroke-width="1.5"/>
  <path d="M4 12c2.7.5 4.8 1.5 6 3-2.5 1.2-4.7 1.2-6 0-1.3-1.2-1.3-1.8 0-3zM20 12c-2.7.5-4.8 1.5-6 3 2.5 1.2 4.7 1.2 6 0 1.3-1.2 1.3-1.8 0-3z" stroke="currentColor" stroke-width="1.5"/>
</svg>`;

/** ====== Render landing GlowUp ====== **/
const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <div class="app">
    <nav class="navbar">
      <div class="brand">
        <img src="/logo-glowup.png" alt="GlowUp" />
        <span>GlowUp</span>
      </div>
      <div class="nav-actions">
        <button id="installBtn" class="install-btn" title="Instalar app" disabled>Instalar</button>
      </div>
    </nav>

    <section class="hero">
      <h1>Brilla con tu mejor versión</h1>
      <p>Consejos de belleza, rutinas de cuidado y tips prácticos — todo en una PWA rápida, offline y lista para instalar.</p>
      <div class="cta-row">
        <button class="primary" id="tipBtn">${IconSparkle} Ver tip del día</button>
        <button class="ghost-btn" id="openDocs">Cómo se hizo</button>
      </div>
    </section>

    <section class="grid">
      <article class="card span-4">
        <h3>${IconBrush} Maquillaje</h3>
        <p>Aplica base en capas finas y difumina con brocha húmeda para un acabado natural.</p>
      </article>

      <article class="card span-4">
        <h3>${IconFace} Rutina facial</h3>
        <p>Usa limpiador suave, tónico hidratante y protector solar SPF 50 todos los días.</p>
      </article>

      <article class="card span-4">
        <h3>${IconNail} Cuidado de uñas</h3>
        <p>Hidrata cutículas con aceite 2–3 veces por semana para evitar quiebres.</p>
      </article>

      <article class="card span-6">
        <h3>${IconLotus} Autocuidado</h3>
        <p>Respira profundo 2 minutos, estírate y toma agua. Pequeños rituales, gran impacto.</p>
      </article>

      <article class="card span-6">
        <h3>${IconSparkle} Consejo rápido</h3>
        <p id="tipText">Pulsa “Ver tip del día” para inspirarte.</p>
      </article>
    </section>

    <footer class="footer">
      <span>© ${new Date().getFullYear()} GlowUp</span>
      <a class="link" href="https://web.dev/learn/pwa/" target="_blank" rel="noreferrer">Aprende PWA</a>
    </footer>
  </div>
`;

/** ====== Tip del día ====== **/
const tips = [
  'Mezcla tu hidratante con unas gotas de iluminador líquido para un efecto “glow” sutil.',
  'Exfolia suave 1–2 veces por semana; evita hacerlo el mismo día que uses retinoides.',
  'El protector solar es el mejor anti-edad: reaplica cada 2–3 horas si estás expuesta al sol.',
  'Para labios jugosos, usa bálsamo con ácido hialurónico antes del labial.',
  'Cepilla cejas hacia arriba y fija con gel transparente para un look fresco.'
];
document.getElementById('tipBtn')?.addEventListener('click', () => {
  const tip = tips[Math.floor(Math.random() * tips.length)];
  const el = document.getElementById('tipText');
  if (el) el.textContent = tip;
});
document.getElementById('openDocs')?.addEventListener('click', () => {
  window.open('https://developer.mozilla.org/es/docs/Web/Progressive_web_apps', '_blank');
});

window.addEventListener('load', () => {
  const splash = document.getElementById('splash-screen') as HTMLElement | null;
  if (!splash) return;
  setTimeout(() => {
    splash.classList.add('hidden');
    setTimeout(() => splash.classList.add('hidden-remove'), 650);
  }, 3000);
});

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const installBtn = document.getElementById('installBtn') as HTMLButtonElement | null;
if (installBtn) installBtn.disabled = true;

window.addEventListener('beforeinstallprompt', (e: Event) => {
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;
  if (installBtn) installBtn.disabled = false;
});

installBtn?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  installBtn.disabled = true;
  await deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('SW registrado'))
      .catch(err => console.error('SW error', err));
  });
}
