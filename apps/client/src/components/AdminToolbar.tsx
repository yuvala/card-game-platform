import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV_LINKS = [
    { to: '/operator', label: 'Operator', newTab: false },
    { to: '/sandbox', label: 'Sandbox', newTab: true },
    { to: '/', label: 'Lobby', newTab: true },
];

interface AdminToolbarProps {
    readonly children?: React.ReactNode;
}

export function AdminToolbar({ children }: AdminToolbarProps) {
    const { pathname } = useLocation();
    return (
        <header className="adminToolbar">
            <span className="adminToolbarBrand">Card Game Dev</span>
            <nav className="adminToolbarNav">
                {NAV_LINKS.map(({ to, label, newTab }) => (
                    <Link
                        key={to}
                        to={to}
                        className={`adminToolbarLink${pathname === to ? ' is-active' : ''}`}
                        target={newTab ? '_blank' : undefined}
                        rel={newTab ? 'noopener noreferrer' : undefined}
                    >
                        {label}
                    </Link>
                ))}
            </nav>
            {children && <div className="adminToolbarActions">{children}</div>}
        </header>
    );
}
