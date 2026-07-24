/* fl-store.js — Favori depolama adaptoru (Supabase + localStorage) */
window.FlDB = window.supabase.createClient(FL_CONFIG.url, FL_CONFIG.key);

window.FlStore = (function ()
{
    const KEY  = 'fl_favorites_v1';
    const TYPE = 'tefas';
    let user = null;

    function readLocal()
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

    function writeLocal(list)
    {
        localStorage.setItem(KEY, JSON.stringify(list));
    }

    const ready = (async () =>
    {
        const { data } = await FlDB.auth.getSession();
        user = data.session ? data.session.user : null;
    })();

    // Giris/cikis oldugunda kullaniciyi guncel tut
    FlDB.auth.onAuthStateChange((event, session) =>
    {
        user = session ? session.user : null;
        if (event === 'SIGNED_IN' && user)
        {
            migrateLocal().then(() => { if (window.FlFavorites) { FlFavorites.refresh(); } });
        }
    });

    async function migrateLocal()
    {
        if (!user)
        {
            const { data } = await FlDB.auth.getSession();
            user = data.session ? data.session.user : null;
        }
        const local = readLocal();
        if (!user || local.length === 0)
        {
            return;
        }
        const rows = local.map(f => ({
            user_id:   user.id,
            fund_code: f.code,
            fund_name: f.name || '',
            fund_type: TYPE
        }));
        await FlDB.from('favorites').upsert(rows, { onConflict: 'user_id,fund_code,fund_type' });
        writeLocal([]);
    }

    return {
        ready,
        migrateLocal,
        currentUser: () => user,
        isLoggedIn:  async () => { await ready; return !!user; },

        list: async () =>
        {
            await ready;
            if (!user)
            {
                return new Set(readLocal().map(f => f.code));
            }
            const { data, error } = await FlDB
                .from('favorites').select('fund_code').eq('fund_type', TYPE);
            if (error)
            {
                console.error('Favori listesi alinamadi', error);
                return new Set();
            }
            return new Set(data.map(r => r.fund_code));
        },

        add: async (code, name) =>
        {
            await ready;
            if (!user)
            {
                const list = readLocal();
                if (!list.some(f => f.code === code))
                {
                    list.push({ code, name, added_at: new Date().toISOString() });
                    writeLocal(list);
                }
                return true;
            }
            const { error } = await FlDB.from('favorites').upsert({
                user_id: user.id, fund_code: code, fund_name: name || '', fund_type: TYPE
            }, { onConflict: 'user_id,fund_code,fund_type' });
            return !error;
        },

        remove: async (code) =>
        {
            await ready;
            if (!user)
            {
                writeLocal(readLocal().filter(f => f.code !== code));
                return true;
            }
            const { error } = await FlDB.from('favorites')
                .delete().eq('fund_code', code).eq('fund_type', TYPE);
            return !error;
        },

        all: async () =>
        {
            await ready;
            if (!user)
            {
                return readLocal();
            }
            const { data, error } = await FlDB.from('favorites')
                .select('fund_code, fund_name, added_at')
                .eq('fund_type', TYPE).order('added_at', { ascending: false });
            return error ? [] : data.map(r => ({
                code: r.fund_code, name: r.fund_name, added_at: r.added_at
            }));
        }
    };
})();
