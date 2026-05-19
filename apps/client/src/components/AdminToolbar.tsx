import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV_LINKS = [
    { to: '/table-admin', label: 'Table Admin' },
    { to: '/sandbox', label: 'Card Sandbox' },
    { to: '/', label: 'Lobby' },
];

interface AdminToolbarProps {
    children?: React.ReactNode;
}

export function AdminToolbar({ children }: AdminToolbarProps) {
    const { pathname } = useLocation();
    return (
        <header className="adminToolbar">
            <span className="adminToolbarBrand">Card Game Dev</span>
            <nav className="adminToolbarNav">
                {NAV_LINKS.map(({ to, label }) => (
                    <Link
                        key={to}
                        to={to}
                        className={`adminToolbarLink${pathname === to ? ' is-active' : ''}`}
                    >
                        {label}
                    </Link>
                ))}
            </nav>
            {children && <div className="adminToolbarActions">{children}</div>}
        </header>
    );
}
