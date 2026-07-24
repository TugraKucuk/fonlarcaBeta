/* fl-store.js — Favori depolama adaptoru
 * Tum fonksiyonlar async: Faz 2'de icerigi Supabase cagrilariyla
 * degistirdigimizde favorites.js'e hic dokunmayacagiz.
 */
window.FlStore = (function ()
{
    const KEY = 'fl_favorites_v1';

    // localStorage'dan diziyi oku
    function read()
    {
        try
        {
            return JSON.parse(localStorage.getItem(KEY)) || [];
        }
        catch
        {
            return [];
        }
    }

    function write(list)
    {
        localStorage.setItem(KEY, JSON.stringify(list));
    }

    return {
        // Giris yapilmis mi? Faz 1'de hesap yok, hep true
        isLoggedIn: async () => true,

        // Favori kodlarin Set'i
        list: async () => new Set(read().map(f => f.code)),

        add: async (code, name) =>
        {
            const list = read();
            if (!list.some(f => f.code === code))
            {
                list.push({ code, name, added_at: new Date().toISOString() });
                write(list);
            }
            return true;
        },

        remove: async (code) =>
        {
            write(read().filter(f => f.code !== code));
            return true;
        },

        // Favorilerim sayfasi icin tam kayitlar
        all: async () => read()
    };
})();
