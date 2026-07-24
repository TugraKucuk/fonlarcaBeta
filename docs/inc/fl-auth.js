/* fl-auth.js — Kod (OTP) tabanli giris/kayit/sifre sifirlama
 * Yonlendirme yok: kod maile gelir, sitede girilir, oturum aninda acilir.
 */
(function ()
{
    // login | signup | otp | forgot | reset
    let mode = 'login';
    let pendingEmail = '';

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
            '<h3 id="fl-title"></h3>' +
            '<p class="fl-sub" id="fl-sub"></p>' +
            '<div class="fl-msg" id="fl-msg"></div>' +

            '<div class="fl-grp" id="g-email">' +
              '<label class="fl-label" for="fl-email">E-posta</label>' +
              '<input type="email" id="fl-email" placeholder="ornek@eposta.com" autocomplete="email">' +
            '</div>' +

            '<div class="fl-grp" id="g-pass">' +
              '<label class="fl-label" for="fl-pass">Sifre</label>' +
              '<input type="password" id="fl-pass" placeholder="En az 6 karakter">' +
            '</div>' +

            '<div class="fl-grp" id="g-code">' +
              '<label class="fl-label" for="fl-code">Dogrulama kodu</label>' +
              '<input type="text" id="fl-code" class="fl-code-input" placeholder="Kod" ' +
                     'inputmode="numeric" maxlength="10" autocomplete="one-time-code">' +
            '</div>' +

            '<div class="fl-grp" id="g-newpass">' +
              '<label class="fl-label" for="fl-newpass">Yeni sifre</label>' +
              '<input type="password" id="fl-newpass" placeholder="En az 6 karakter">' +
            '</div>' +

            '<div class="fl-forgot-row" id="g-forgot">' +
              '<a href="#" id="fl-forgot">Sifremi unuttum</a>' +
            '</div>' +

            '<button class="fl-submit" id="fl-submit"></button>' +

            '<p class="fl-switch" id="g-switch">' +
              '<span id="fl-switch-text"></span> <a href="#" id="fl-switch"></a>' +
            '</p>' +
            '<p class="fl-switch" id="g-resend" style="display:none">' +
              '<a href="#" id="fl-resend">Kodu tekrar gonder</a>' +
            '</p>' +
          '</div>' +
        '</div>';
        document.body.appendChild(d);

        d.querySelector('.fl-backdrop').onclick = close;
        d.querySelector('.fl-close').onclick    = close;
        el('fl-switch').onclick = (e) => { e.preventDefault(); setMode(mode === 'signup' ? 'login' : 'signup'); };
        el('fl-forgot').onclick = (e) => { e.preventDefault(); setMode('forgot'); };
        el('fl-resend').onclick = (e) => { e.preventDefault(); resend(); };
        el('fl-submit').onclick = submit;

        d.addEventListener('keydown', (e) =>
        {
            if (e.key === 'Enter')  { submit(); }
            if (e.key === 'Escape') { close(); }
        });
    }

    // Her mod icin: baslik, aciklama, buton, gorunur alanlar
    const MODLAR = {
        login:  { t: 'Giris Yap',        s: 'Favorileriniz tum cihazlarinizda sizinle.',
                  b: 'Giris Yap',        f: ['g-email', 'g-pass', 'g-forgot', 'g-switch'] },
        signup: { t: 'Kayit Ol',         s: 'Ucretsiz hesap olusturun, favorileriniz kaybolmasin.',
                  b: 'Hesap Olustur',    f: ['g-email', 'g-pass', 'g-switch'] },
        otp:    { t: 'Kodu Girin',       s: '',
                  b: 'Dogrula ve Giris Yap', f: ['g-code', 'g-resend'] },
        forgot: { t: 'Sifremi Unuttum',  s: 'E-posta adresinizi girin, size bir kod gonderelim.',
                  b: 'Kod Gonder',       f: ['g-email', 'g-switch'] },
        reset:  { t: 'Yeni Sifre',       s: '',
                  b: 'Sifremi Guncelle', f: ['g-code', 'g-newpass', 'g-resend'] }
    };

    function setMode(m)
    {
        mode = m;
        const cfg = MODLAR[m];

        el('fl-title').textContent  = cfg.t;
        el('fl-submit').textContent = cfg.b;
        el('fl-sub').textContent    = cfg.s ||
            (pendingEmail ? (pendingEmail + ' adresine gonderilen 6 haneli kodu girin.') : '');

        // Once hepsini gizle, sonra moda ait olanlari goster
        ['g-email', 'g-pass', 'g-code', 'g-newpass', 'g-forgot', 'g-switch', 'g-resend']
            .forEach(id => { el(id).style.display = 'none'; });
        cfg.f.forEach(id => { el(id).style.display = 'block'; });

        el('fl-switch-text').textContent = (m === 'signup') ? 'Zaten uye misiniz?' : 'Hesabiniz yok mu?';
        el('fl-switch').textContent      = (m === 'signup') ? 'Giris yapin' : 'Kayit olun';

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

    async function resend()
    {
        if (!pendingEmail)
        {
            return;
        }
        msg('Kod tekrar gonderiliyor...');
        const { error } = (mode === 'reset')
            ? await FlDB.auth.resetPasswordForEmail(pendingEmail)
            : await FlDB.auth.resend({ type: 'signup', email: pendingEmail });
        msg(error ? ('Hata: ' + error.message) : 'Yeni kod gonderildi.', error ? 'err' : 'ok');
    }

    // Oturum acildiktan sonra yereldeki favorileri hesaba tasi
    async function bitir()
    {
        await new Promise(r => setTimeout(r, 300));   // oturumun oturmasi icin
        await FlStore.migrateLocal();
        location.reload();
    }

    async function submit()
    {
        const btn = el('fl-submit');
        btn.disabled = true;

        try
        {
            // ── Kayit: kod iste ──
            if (mode === 'signup')
            {
                const email = el('fl-email').value.trim();
                const pass  = el('fl-pass').value;
                if (!email || pass.length < 6)
                {
                    msg('E-posta girin, sifre en az 6 karakter olsun.', 'err'); return;
                }
                msg('Hesap olusturuluyor...');
                const { error } = await FlDB.auth.signUp({ email: email, password: pass });
                if (error)
                {
                    msg('Hata: ' + error.message, 'err'); return;
                }
                pendingEmail = email;
                setMode('otp');
                setTimeout(() => el('fl-code').focus(), 50);
                return;
            }

            // ── Kayit kodunu dogrula ──
            if (mode === 'otp')
            {
                const code = el('fl-code').value.trim();
                if (code.length < 6)
                {
                    msg('Maildeki kodu eksiksiz girin.', 'err'); return;
                }
                msg('Dogrulaniyor...');
                const { error } = await FlDB.auth.verifyOtp({
                    email: pendingEmail, token: code, type: 'signup'
                });
                if (error)
                {
                    msg('Kod hatali veya suresi dolmus.', 'err'); return;
                }
                msg('Hesabiniz onaylandi, giris yapiliyor...', 'ok');
                await bitir();
                return;
            }

            // ── Sifremi unuttum: kod iste ──
            if (mode === 'forgot')
            {
                const email = el('fl-email').value.trim();
                if (!email)
                {
                    msg('E-posta adresinizi girin.', 'err'); return;
                }
                msg('Kod gonderiliyor...');
                const { error } = await FlDB.auth.resetPasswordForEmail(email);
                if (error)
                {
                    msg('Hata: ' + error.message, 'err'); return;
                }
                pendingEmail = email;
                setMode('reset');
                setTimeout(() => el('fl-code').focus(), 50);
                return;
            }

            // ── Yeni sifre belirle ──
            if (mode === 'reset')
            {
                const code = el('fl-code').value.trim();
                const np   = el('fl-newpass').value;
                if (code.length < 6 || np.length < 6)
                {
                    msg('Kodu girin ve sifre en az 6 karakter olsun.', 'err'); return;
                }
                msg('Dogrulaniyor...');
                const v = await FlDB.auth.verifyOtp({
                    email: pendingEmail, token: code, type: 'recovery'
                });
                if (v.error)
                {
                    msg('Kod hatali veya suresi dolmus.', 'err'); return;
                }
                const u = await FlDB.auth.updateUser({ password: np });
                if (u.error)
                {
                    msg('Sifre guncellenemedi: ' + u.error.message, 'err'); return;
                }
                msg('Sifreniz guncellendi, giris yapiliyor...', 'ok');
                await bitir();
                return;
            }

            // ── Normal giris ──
            const email = el('fl-email').value.trim();
            const pass  = el('fl-pass').value;
            if (!email || !pass)
            {
                msg('E-posta ve sifrenizi girin.', 'err'); return;
            }
            msg('Giris yapiliyor...');
            const { error } = await FlDB.auth.signInWithPassword({ email: email, password: pass });
            if (error)
            {
                msg('E-posta veya sifre hatali.', 'err'); return;
            }
            msg('Giris yapildi...', 'ok');
            await bitir();
        }
        finally
        {
            btn.disabled = false;
        }
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
        // renderButton(); -- fl-ui.js devraldi
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
