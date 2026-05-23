import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AdminToolbar } from '../components/AdminToolbar';
import { GamePanel } from '../app/app/GamePanel';

export function TableRoute() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isWatchMode = searchParams.get('watch') === '1';

    useEffect(() => {
        import('../app/main').then((m) => m.init());
    }, []);

    return (
        <div className="adminShell">
            <AdminToolbar>
                <button className="operatorBtn operatorBtn--back" onClick={() => navigate('/operator')}>← Operator</button>
                <span id="game-title" className="adminToolbarGameTitle">
                    Card Game
                </span>
            </AdminToolbar>
            {!isWatchMode && <GamePanel />}
            <div id="game-root" className="appRoot"></div>
        </div>
    );
}
