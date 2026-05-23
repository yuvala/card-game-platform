import React, { useEffect } from 'react';
import { AdminToolbar } from '../components/AdminToolbar';
import { GamePanel } from '../app/app/GamePanel';
import { AdminRoomList } from '../components/AdminRoomList';

export function TableAdminRoute() {
    useEffect(() => {
        import('../app/main').then((m) => m.init());
    }, []);

    return (
        <div className="adminShell">
            <AdminToolbar>
                <span id="game-title" className="adminToolbarGameTitle">
                    Card Game
                </span>
            </AdminToolbar>
            <GamePanel />
            <div id="game-root" className="appRoot"></div>
            <AdminRoomList />
        </div>
    );
}
