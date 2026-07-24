/* fl-auth.js — Giris / Kayit / Kod dogrulama / Sifre sifirlama + Google */
(function ()
{
    let mode = 'login';        // login | signup | otp | forgot | reset
    let pendingEmail = '';
    const KOD_UZUNLUK = 6;

    // Sitenin kok adresi (alt dizinde de dogru calisir)
    const BASE = location.origin + location.pathname.replace(/[^/]*$/, '');

    function el(id)
    {
        return document.getElementById(id);
    }

    // ── Kod kutucuklari ──
    function kodKutulari()
    {
        let h = '<div class="fl-otp" id="fl-otp">';
        for (let i = 0; i < KOD_UZUNLUK; i++)
        {
            h += '<input type="text" class="fl-otp-box" inputmode="numeric" maxlength="1" ' +
                 'data-i="' + i + '" autocomplete="' + (i === 0 ? 'one-time-code' : 'off') + '">';
        }
        return h + '</div>';
    }

    function kodOku()
    {
        return Array.from(document.querySelectorAll('.fl-otp-box'))
                    .map(i => i.value.trim()).join('');
    }

    function kodTemizle()
    {
        document.querySelectorAll('.fl-otp-box').forEach(i => { i.value = ''; });
    }

    function kodOdakla()
    {
        const ilk = document.querySelector('.fl-otp-box');
        if (ilk)
        {
            ilk.focus();
        }
    }

    function kodDavranis()
    {
        const boxes = Array.from(document.querySelectorAll('.fl-otp-box'));

        boxes.forEach((box, i) =>
        {
            box.addEventListener('input', () =>
            {
                box.value = box.value.replace(/\D/g, '');   // sadece rakam
                if (box.value && i < boxes.length - 1)
                {
                    boxes[i + 1].focus();
                }
                // Hepsi doldu ise otomatik gonder
                if (kodOku().length === KOD_UZUNLUK)
                {
                    submit();
                }
            });

            box.addEventListener('keydown', (e) =>
            {
                if (e.key === 'Backspace' && !box.value && i > 0)
                {
                    boxes[i - 1].focus();
                }
                if (e.key === 'ArrowLeft'  && i > 0)                { boxes[i - 1].focus(); }
                if (e.key === 'ArrowRight' && i < boxes.length - 1) { boxes[i + 1].focus(); }
            });

            // Kodu tek seferde yapistirma
            box.addEventListener('paste', (e) =>
            {
                e.preventDefault();
                const veri = (e.clipboardData.getData('text') || '').replace(/\D/g, '');
                boxes.forEach((b, j) => { b.value = veri[j] || ''; });
                if (veri.length >= KOD_UZUNLUK)
                {
                    submit();
                }
            });
        });
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

            '<div class="fl-grp" id="g-google">' +
              '<button class="fl-google" id="fl-google">' +
                '<svg width="17" height="17" viewBox="0 0 48 48">' +
                  '<path fill="#4285F4" d="M45 24c0-1.6-.1-2.7-.4-4H24v8h12c-.2 2-1.6 5-4.5 7l7 5.4C42.7 36.6 45 31 45 24z"/>' +
                  '<path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7-5.4C29.7 36.5 27.1 37.4 24 37.4c-5.8 0-10.7-3.9-12.5-9.1l-7.2 5.6C7.9 41.3 15.4 46 24 46z"/>' +
                  '<path fill="#FBBC05" d="M11.5 28.3c-.5-1.4-.7-2.8-.7-4.3s.3-2.9.7-4.3l-7.2-5.6C2.8 17 2 20.4 2 24s.8 7 2.3 9.9l7.2-5.6z"/>' +
                  '<path fill="#EA4335" d="M24 10.6c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.1 30 2 24 2 15.4 2 7.9 6.7 4.3 14.1l7.2 5.6C13.3 14.5 18.2 10.6 24 10.6z"/>' +
                '</svg>' +
                '<span>Google ile devam et</span>' +
              '</button>' +
              '<div class="fl-ayirac"><span>veya</span></div>' +
            '</div>' +

            '<div class="fl-grp" id="g-email">' +
              '<label class="fl-label" for="fl-email">E-posta</label>' +
              '<input type="email" id="fl-email" placeholder="ornek@eposta.com" autocomplete="email">' +
            '</div>' +

            '<div class="fl-grp" id="g-pass">' +
              '<label class="fl-label" for="fl-pass">Sifre</label>' +
              '<input type="password" id="fl-pass" placeholder="En az 6 karakter">' +
            '</div>' +

            '<div class="fl-grp" id="g-code">' +
              '<label class="fl-label">Dogrulama kodu</label>' +
              kodKutulari() +
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
            '<p class="fl-switch" id="g-resend">' +
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
        el('fl-google').onclick = googleGiris;
        el('fl-submit').onclick = submit;

        d.addEventListener('keydown', (e) =>
        {
            if (e.key === 'Enter' && !e.target.classList.contains('fl-otp-box')) { submit(); }
            if (e.key === 'Escape') { close(); }
        });

        kodDavranis();
    }

    const MODLAR = {
        login:  { t: 'Giris Yap',       s: 'Favorileriniz tum cihazlarinizda sizinle.',
                  b: 'Giris Yap',       f: ['g-google', 'g-email', 'g-pass', 'g-forgot', 'g-switch'] },
        signup: { t: 'Kayit Ol',        s: 'Ucretsiz hesap olusturun, favorileriniz kaybolmasin.',
                  b: 'Hesap Olustur',   f: ['g-google', 'g-email', 'g-pass', 'g-switch'] },
        otp:    { t: 'Kodu Girin',      s: '',
                  b: 'Dogrula ve Giris Yap', f: ['g-code', 'g-resend'] },
        forgot: { t: 'Sifremi Unuttum', s: 'E-posta adresinizi girin, size bir kod gonderelim.',
                  b: 'Kod Gonder',      f: ['g-email', 'g-switch'] },
        reset:  { t: 'Yeni Sifre',      s: '',
                  b: 'Sifremi Guncelle', f: ['g-code', 'g-newpass', 'g-resend'] }
    };

    function setMode(m)
    {
        mode = m;
        const cfg = MODLAR[m];

        el('fl-title').textContent  = cfg.t;
        el('fl-submit').textContent = cfg.b;
        el('fl-sub').textContent    = cfg.s ||
            (pendingEmail ? (pendingEmail + ' adresine gonderilen kodu girin.') : '');

        ['g-google', 'g-email', 'g-pass', 'g-code', 'g-newpass', 'g-forgot', 'g-switch', 'g-resend']
            .forEach(id => { el(id).style.display = 'none'; });
        cfg.f.forEach(id => { el(id).style.display = 'block'; });

        el('fl-switch-text').textContent = (m === 'signup') ? 'Zaten uye misiniz?' : 'Hesabiniz yok mu?';
        el('fl-switch').textContent      = (m === 'signup') ? 'Giris yapin' : 'Kayit olun';

        if (m === 'otp' || m === 'reset')
        {
            kodTemizle();
            setTimeout(kodOdakla, 60);
        }
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
        setTimeout(() => { const e = el('fl-email'); if (e.offsetParent) { e.focus(); } }, 60);
    }

    function close()
    {
        el('fl-modal').classList.remove('show');
    }

    async function googleGiris()
    {
        msg('Google\'a yonlendiriliyorsunuz...');
        const { error } = await FlDB.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: BASE }
        });
        if (error)
        {
            msg('Google girisi baslatilamadi: ' + error.message, 'err');
        }
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
        kodTemizle();
        kodOdakla();
    }

    async function bitir()
    {
        await new Promise(r => setTimeout(r, 300));
        await FlStore.migrateLocal();
        location.reload();
    }

    let calisiyor = false;

    async function submit()
    {
        if (calisiyor)
        {
            return;
        }
        calisiyor = true;
        const btn = el('fl-submit');
        btn.disabled = true;

        try
        {
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
                return;
            }

            if (mode === 'otp')
            {
                const code = kodOku();
                if (code.length !== KOD_UZUNLUK)
                {
                    msg('Kodu eksiksiz girin.', 'err'); return;
                }
                msg('Dogrulaniyor...');
                const { error } = await FlDB.auth.verifyOtp({
                    email: pendingEmail, token: code, type: 'signup'
                });
                if (error)
                {
                    msg('Kod hatali veya suresi dolmus.', 'err');
                    kodTemizle(); kodOdakla(); return;
                }
                msg('Hesabiniz onaylandi, giris yapiliyor...', 'ok');
                await bitir();
                return;
            }

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
                return;
            }

            if (mode === 'reset')
            {
                const code = kodOku();
                const np   = el('fl-newpass').value;
                if (code.length !== KOD_UZUNLUK)
                {
                    msg('Kodu eksiksiz girin.', 'err'); return;
                }
                if (np.length < 6)
                {
                    msg('Yeni sifre en az 6 karakter olmalidir.', 'err'); return;
                }
                msg('Dogrulaniyor...');
                const v = await FlDB.auth.verifyOtp({
                    email: pendingEmail, token: code, type: 'recovery'
                });
                if (v.error)
                {
                    msg('Kod hatali veya suresi dolmus.', 'err');
                    kodTemizle(); kodOdakla(); return;
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

            // Normal giris
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
            calisiyor = false;
            btn.disabled = false;
        }
    }

    function init()
    {
        buildModal();
        setMode('login');
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
