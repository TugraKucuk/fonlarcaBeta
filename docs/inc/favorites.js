/* favorites.js — Yildiz butonu sistemi
 * Tablolari tarar, fon kodu iceren her satirin basina yildiz ekler.
 */
(function ()
{
    let favSet = new Set();
    const CODE_RE = /^[A-Z0-9]{3}$/;   // TEFAS fon kodu: 3 karakter

    // Satirdan fon kodunu cikar (ilk hucredeki link metni)
    function codeOf(tr)
    {
        const a = tr.querySelector('td:first-child a');
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

    function starHtml(code, isFav)
    {
        return '<button class="fl-star" data-code="' + code + '" ' +
               'aria-label="Favorilere ekle" ' +
               'aria-pressed="' + (isFav ? 'true' : 'false') + '">' +
               (isFav ? '\u2605' : '\u2606') + '</button>';
    }

    // Tablolari tara, eksik yildizlari ekle
    function inject(root)
    {
        (root || document).querySelectorAll('table tr').forEach(tr =>
        {
            if (tr.dataset.flDone)
            {
                return;
            }
            const code = codeOf(tr);
            if (!code)
            {
                return;
            }
            tr.dataset.flDone = '1';

            const cell = document.createElement('td');
            cell.className = 'fl-star-cell';
            cell.innerHTML = starHtml(code, favSet.has(code));
            tr.insertBefore(cell, tr.firstChild);
        });
    }

    // Delegasyonlu tiklama — sonradan eklenen satirlar icin de calisir
    document.addEventListener('click', async (e) =>
    {
        const btn = e.target.closest('.fl-star');
        if (!btn)
        {
            return;
        }
        const code = btn.dataset.code;
        const tr = btn.closest('tr');

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
            btn.textContent = favSet.has(code) ? '\u2605' : '\u2606';
            btn.setAttribute('aria-pressed', favSet.has(code) ? 'true' : 'false');
        }
        finally
        {
            btn.disabled = false;
        }
    });

    // Panel yeniden render edilince yildizlari tekrar bas
    const observer = new MutationObserver(muts =>
    {
        muts.forEach(m => m.addedNodes.forEach(n =>
        {
            if (n.nodeType === 1)
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
