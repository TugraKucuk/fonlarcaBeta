/* fl-ui.js — Basliga gomulu hesap menusu */
(function ()
{
    function harf(email)
    {
        return email.charAt(0).toUpperCase();
    }

    async function render()
    {
        const header = document.querySelector('.header');
        if (!header)
        {
            return;
        }
        header.classList.add('fl-header-rel');

        const wrap = document.createElement('div');
        wrap.id = 'fl-account';

        const loggedIn = await FlStore.isLoggedIn();

        if (!loggedIn)
        {
            wrap.innerHTML =
                '<button class="fl-btn-login" id="fl-login">' +
                  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" ' +
                       'stroke="currentColor" stroke-width="2.2" stroke-linecap="round">' +
                    '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>' +
                    '<polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>' +
                  '</svg>' +
                  '<span>Giris Yap</span>' +
                '</button>';
            header.appendChild(wrap);
            document.getElementById('fl-login').onclick = () => FlAuth.open('login');
            return;
        }

        const u    = FlStore.currentUser();
        const isim = u.email.split('@')[0];

        wrap.innerHTML =
            '<button class="fl-btn-user" id="fl-user">' +
              '<span class="fl-avatar">' + harf(u.email) + '</span>' +
              '<span class="fl-uname">' + isim + '</span>' +
              '<svg class="fl-chev" width="11" height="11" viewBox="0 0 24 24" fill="none" ' +
                   'stroke="currentColor" stroke-width="3" stroke-linecap="round">' +
                '<polyline points="6 9 12 15 18 9"/>' +
              '</svg>' +
            '</button>' +
            '<div class="fl-menu" id="fl-menu">' +
              '<div class="fl-menu-head">' +
                '<div class="fl-menu-name">' + isim + '</div>' +
                '<div class="fl-menu-mail">' + u.email + '</div>' +
              '</div>' +
              '<a href="favorilerim.html" class="fl-menu-item">&#9733;&nbsp; Favorilerim</a>' +
              '<button class="fl-menu-item fl-danger" id="fl-logout">&#8618;&nbsp; Cikis Yap</button>' +
            '</div>';
        header.appendChild(wrap);

        const menu = document.getElementById('fl-menu');

        document.getElementById('fl-user').onclick = (e) =>
        {
            e.stopPropagation();
            menu.classList.toggle('show');
        };

        document.getElementById('fl-logout').onclick = async () =>
        {
            await FlDB.auth.signOut();
            location.reload();
        };

        // Disariya tiklayinca menuyu kapat
        document.addEventListener('click', () => menu.classList.remove('show'));
        menu.addEventListener('click', (e) => e.stopPropagation());
    }

    if (document.readyState === 'loading')
    {
        document.addEventListener('DOMContentLoaded', render);
    }
    else
    {
        render();
    }
})();
