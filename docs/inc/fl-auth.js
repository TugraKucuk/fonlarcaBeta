/* fl-auth.js — Giris / Kayit / Sifremi unuttum modali + sag ust buton */
(function ()
{
    let mode = 'login';   // login | signup | forgot

    // Sitenin kok adresi — hem yerelde hem GitHub Pages'te dogru calisir
    const BASE = location.origin + location.pathname.replace(/[^/]*$/, '');

    function el(id)
    {
        return document.getElementById(id);
    }

    function buildModal()
    {
        const d = document.createElement('div');
        d.id = 'fl-modal';
        d.innerHTML =
        '<div class="fl-backdrop"></div>' +
        '<div class="fl-box" role="dialog" aria-modal="true">' +
          '<button class="fl-close" aria-label="Kapat">&times;</button>' +
          '<div class="fl-brand">FONLARCA</div>' +
          '<div class="fl-body">' +
            '<h3 id="fl-title">Giris Yap</h3>' +
            '<p class="fl-sub" id="fl-sub">Favorilerinizi tum cihazlarinizda saklayin.</p>' +
            '<div class="fl-msg" id="fl-msg"></div>' +
            '<label class="fl-label" for="fl-email">E-posta</label>' +
            '<input type="email" id="fl-email" placeholder="ornek@eposta.com" autocomplete="email">' +
            '<div id="fl-pass-wrap">' +
              '<label class="fl-label" for="fl-pass">Sifre</label>' +
              '<input type="password" id="fl-pass" placeholder="En az 6 karakter">' +
            '</div>' +
            '<div class="fl-forgot-row" id="fl-forgot-row">' +
              '<a href="#" id="fl-forgot">Sifremi unuttum</a>' +
            '</div>' +
            '<button class="fl-submit" id="fl-submit">Giris Yap</button>' +
            '<p class="fl-switch">' +
              '<span id="fl-switch-text">Hesabiniz yok mu?</span> ' +
              '<a href="#" id="fl-switch">Kayit olun</a>' +
            '</p>' +
          '</div>' +
        '</div>';
        document.body.appendChild(d);

        d.querySelector('.fl-backdrop').onclick = close;
        d.querySelector('.fl-close').onclick    = close;
        el('fl-switch').onclick = (e) => { e.preventDefault(); setMode(mode === 'signup' ? 'login' : 'signup'); };
        el('fl-forgot').onclick = (e) => { e.preventDefault(); setMode('forgot'); };
        el('fl-submit').onclick = submit;

        d.addEventListener('keydown', (e) =>
        {
            if (e.key === 'Enter')  { submit(); }
            if (e.key === 'Escape') { close(); }
        });
    }

    function setMode(m)
    {
        mode = m;
        const t = {
            login:  ['Giris Yap',  'Favorilerinizi tum cihazlarinizda saklayin.', 'Giris Yap'],
            signup: ['Kayit Ol',   'Ucretsiz hesap olusturun, favorileriniz hesabiniza kaydedilsin.', 'Hesap Olustur'],
            forgot: ['Sifremi Sifirla', 'E-posta adresinizi girin, sifirlama linki gonderelim.', 'Link Gonder']
        }[m];

        el('fl-title').textContent  = t[0];
        el('fl-sub').textContent    = t[1];
        el('fl-submit').textContent = t[2];

        el('fl-pass-wrap').style.display  = (m === 'forgot') ? 'none' : 'block';
        el('fl-forgot-row').style.display = (m === 'login')  ? 'block' : 'none';
        el('fl-switch-text').textContent  = (m === 'signup') ? 'Zaten uye misiniz?' : 'Hesabiniz yok mu?';
        el('fl-switch').textContent       = (m === 'signup') ? 'Giris yapin' : 'Kayit olun';

        msg('');
    }

    function msg(text, tip)
    {
        const m = el('fl-msg');
        m.textContent = text;
        m.className   = 'fl-msg' + (text ? ' ' + (tip || 'info') : '');
    }

    function open(m)
    {
        setMode(m || 'login');
        el('fl-modal').classList.add('show');
        setTimeout(() => el('fl-email').focus(), 50);
    }

    function close()
    {
        el('fl-modal').classList.remove('show');
    }

    async function submit()
    {
        const email = el('fl-email').value.trim();
        const pass  = el('fl-pass').value;
        const btn   = el('fl-submit');

        if (!email)
        {
            msg('E-posta adresinizi girin.', 'err'); return;
        }
        if (mode !== 'forgot' && pass.length < 6)
        {
            msg('Sifre en az 6 karakter olmalidir.', 'err'); return;
        }

        btn.disabled = true;

        // ── Sifremi unuttum ──
        if (mode === 'forgot')
        {
            msg('Gonderiliyor...');
            const { error } = await FlDB.auth.resetPasswordForEmail(email, {
                redirectTo: BASE + 'sifre-sifirla.html'
            });
            btn.disabled = false;
            msg(error ? ('Hata: ' + error.message)
                      : 'Sifirlama linki e-postaniza gonderildi.', error ? 'err' : 'ok');
            return;
        }

        // ── Kayit ──
        if (mode === 'signup')
        {
            msg('Hesap olusturuluyor...');
            const { error } = await FlDB.auth.signUp({
                email: email,
                password: pass,
                options: { emailRedirectTo: BASE + 'onay.html' }
            });
            btn.disabled = false;
            if (error)
            {
                msg('Hata: ' + error.message, 'err'); return;
            }
            msg('E-postaniza dogrulama linki gonderildi. Linke tiklayinca otomatik giris yapilacak.', 'ok');
            return;
        }

        // ── Giris ──
        msg('Giris yapiliyor...');
        const { error } = await FlDB.auth.signInWithPassword({ email: email, password: pass });
        btn.disabled = false;
        if (error)
        {
            msg('Giris basarisiz. E-posta veya sifre hatali.', 'err'); return;
        }
        msg('Giris yapildi...', 'ok');
        await FlStore.migrateLocal();
        location.reload();
    }

    // Sag ust kose butonu
    async function renderButton()
    {
        const b = document.createElement('button');
        b.id = 'fl-authbtn';

        if (await FlStore.isLoggedIn())
        {
            const u = FlStore.currentUser();
            b.innerHTML = '<span class="fl-dot"></span>' + u.email.split('@')[0];
            b.title = 'Cikis yapmak icin tiklayin';
            b.onclick = async () =>
            {
                await FlDB.auth.signOut();
                location.reload();
            };
        }
        else
        {
            b.textContent = 'Giris Yap';
            b.onclick = () => open('login');
        }
        document.body.appendChild(b);
    }

    function init()
    {
        buildModal();
        setMode('login');
        renderButton();
    }

    if (document.readyState === 'loading')
    {
        document.addEventListener('DOMContentLoaded', init);
    }
    else
    {
        init();
    }

    window.FlAuth = { open: open, close: close };
})();
