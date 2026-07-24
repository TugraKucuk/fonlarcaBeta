/* fl-auth.js — Giris/Kayit modali ve navbar butonu */
(function ()
{
    let mode = 'login';   // login | signup

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
            '<div class="fl-box">' +
              '<button class="fl-close" aria-label="Kapat">&times;</button>' +
              '<h3 id="fl-title">Giris Yap</h3>' +
              '<div class="fl-msg" id="fl-msg"></div>' +
              '<input type="email" id="fl-email" placeholder="E-posta" autocomplete="email">' +
              '<input type="password" id="fl-pass" placeholder="Sifre (en az 6 karakter)" autocomplete="current-password">' +
              '<button class="fl-submit" id="fl-submit">Giris Yap</button>' +
              '<p class="fl-switch">' +
                '<span id="fl-switch-text">Hesabiniz yok mu?</span> ' +
                '<a href="#" id="fl-switch">Kayit olun</a>' +
              '</p>' +
            '</div>';
        document.body.appendChild(d);

        d.querySelector('.fl-backdrop').onclick = close;
        d.querySelector('.fl-close').onclick    = close;
        el('fl-switch').onclick = (e) => { e.preventDefault(); setMode(mode === 'login' ? 'signup' : 'login'); };
        el('fl-submit').onclick = submit;
        d.onkeydown = (e) => { if (e.key === 'Enter') { submit(); } };
    }

    function setMode(m)
    {
        mode = m;
        const isLogin = m === 'login';
        el('fl-title').textContent       = isLogin ? 'Giris Yap' : 'Kayit Ol';
        el('fl-submit').textContent      = isLogin ? 'Giris Yap' : 'Kayit Ol';
        el('fl-switch-text').textContent = isLogin ? 'Hesabiniz yok mu?' : 'Zaten uye misiniz?';
        el('fl-switch').textContent      = isLogin ? 'Kayit olun' : 'Giris yapin';
        msg('');
    }

    function msg(text, isError)
    {
        const m = el('fl-msg');
        m.textContent = text;
        m.className   = 'fl-msg' + (text ? (isError ? ' err' : ' ok') : '');
    }

    function open()
    {
        el('fl-modal').classList.add('show');
        el('fl-email').focus();
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

        if (!email || pass.length < 6)
        {
            msg('E-posta girin ve sifre en az 6 karakter olsun.', true);
            return;
        }

        btn.disabled = true;
        msg('Islem yapiliyor...');

        if (mode === 'signup')
        {
            const { error } = await FlDB.auth.signUp({ email: email, password: pass });
            btn.disabled = false;
            if (error)
            {
                msg(error.message, true);
                return;
            }
            msg('E-postaniza dogrulama linki gonderildi. Onayladiktan sonra giris yapabilirsiniz.');
            return;
        }

        const { error } = await FlDB.auth.signInWithPassword({ email: email, password: pass });
        btn.disabled = false;
        if (error)
        {
            msg('Giris basarisiz: ' + error.message, true);
            return;
        }
        msg('Giris yapildi, sayfa yenileniyor...');
        await FlStore.migrateLocal();
        location.reload();
    }

    // Navbar'a giris/cikis baglantisi ekle
    async function renderNav()
    {
        const nav = document.querySelector('.nav-bar');
        if (!nav)
        {
            return;
        }
        const a = document.createElement('a');
        a.href = '#';
        a.style.background = 'rgba(255,255,255,0.12)';

        if (await FlStore.isLoggedIn())
        {
            const u = FlStore.currentUser();
            a.textContent = 'Cikis (' + u.email.split('@')[0] + ')';
            a.onclick = async (e) =>
            {
                e.preventDefault();
                await FlDB.auth.signOut();
                location.reload();
            };
        }
        else
        {
            a.textContent = 'Giris Yap';
            a.onclick = (e) => { e.preventDefault(); open(); };
        }
        nav.appendChild(a);
    }

    function init()
    {
        buildModal();
        setMode('login');
        renderNav();
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
