import React from 'react';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    if (!open) return null;

    return (
        <div className="confirmDialogOverlay" onClick={onCancel}>
            <div className="confirmDialogCard" onClick={(e) => e.stopPropagation()}>
                <p className="confirmDialogTitle">{title}</p>
                {message && <p className="confirmDialogMessage">{message}</p>}
                <div className="confirmDialogActions">
                    <button className="confirmDialogCancel" onClick={onCancel}>
                        {cancelLabel}
                    </button>
                    <button className="confirmDialogConfirm" onClick={onConfirm}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
