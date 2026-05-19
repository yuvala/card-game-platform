import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LobbyRoute } from './routes/LobbyRoute';
import { TableAdminRoute } from './routes/TableAdminRoute';
import { PlayerRoute } from './routes/PlayerRoute';
import { SandboxRoute } from './routes/SandboxRoute';

export function App() {
    return (
        <Routes>
            <Route path="/" element={<LobbyRoute />} />
            <Route path="/table-admin" element={<TableAdminRoute />} />
            <Route path="/player" element={<PlayerRoute />} />
            <Route path="/sandbox" element={<SandboxRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
