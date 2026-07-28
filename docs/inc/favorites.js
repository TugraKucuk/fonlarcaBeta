/* favorites.js — Yildiz butonu sistemi
 * Yildizi YENI SUTUN olarak degil, ilk hucrenin ICINE ekler.
 * Boylece DataTables sutun sayisi bozulmaz.
 */
(function ()
{
    let favSet = new Set();
    const CODE_RE = /^[A-Z0-9]{3}$/;   // TEFAS fon kodu: 3 karakter

    function codeOf(cell)
    {
        const a = cell.querySelector('a');
        if (!a)
        {
            return null;
        }
        const txt = a.textContent.trim().toUpperCase();
        return CODE_RE.test(txt) ? txt : null;
    }

    // Fon adi — 2. hucre
    function nameOf(tr)
    {
        const td = tr.querySelectorAll('td')[1];
        return td ? td.textContent.trim() : '';
    }

    function inject(root)
    {
        (root || document).querySelectorAll('table tr').forEach(tr =>
        {
            const cell = tr.querySelector('td:first-child');
            if (!cell || cell.dataset.flDone)
            {
                return;
            }
            const code = codeOf(cell);
            if (!code)
            {
                return;
            }
            cell.dataset.flDone = '1';

            const btn = document.createElement('button');
            btn.className = 'fl-star';
            btn.dataset.code = code;
            btn.setAttribute('aria-label', 'Favorilere ekle');
            btn.setAttribute('aria-pressed', favSet.has(code) ? 'true' : 'false');
            btn.textContent = favSet.has(code) ? '\u2605' : '\u2606';
            cell.insertBefore(btn, cell.firstChild);
        });
    }

    // Delegasyonlu tiklama
    document.addEventListener('click', async (e) =>
    {
        const btn = e.target.closest('.fl-star');
        if (!btn)
        {
            return;
        }
        e.preventDefault();
        e.stopPropagation();

        // Giris yoksa favorileme yerine giris modalini ac
        if (!(await FlStore.isLoggedIn()))
        {
            if (window.FlAuth) { FlAuth.open("login"); }
            return;
        }

        const code = btn.dataset.code;
        const tr   = btn.closest('tr');

        btn.disabled = true;
        try
        {
            if (favSet.has(code))
            {
                await FlStore.remove(code);
                favSet.delete(code);
            }
            else
            {
                await FlStore.add(code, nameOf(tr));
                favSet.add(code);
            }
        }
        finally
        {
            btn.disabled = false;
        }

        // Ayni fon birden fazla tabloda olabilir — hepsini guncelle
        document.querySelectorAll('.fl-star[data-code="' + code + '"]').forEach(b =>
        {
            b.textContent = favSet.has(code) ? '\u2605' : '\u2606';
            b.setAttribute('aria-pressed', favSet.has(code) ? 'true' : 'false');
        });
    });

    const observer = new MutationObserver(muts =>
    {
        muts.forEach(m => m.addedNodes.forEach(n =>
        {
            if (n.nodeType === 1 && n.tagName !== 'BUTTON')
            {
                inject(n);
            }
        }));
    });

    async function init()
    {
        favSet = await FlStore.list();
        inject(document);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading')
    {
        document.addEventListener('DOMContentLoaded', init);
    }
    else
    {
        init();
    }

    window.FlFavorites = { refresh: init };
})();
