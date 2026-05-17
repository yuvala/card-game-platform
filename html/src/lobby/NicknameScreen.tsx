import React, { useState } from "react";

interface Props {
    onSubmit: (nickname: string) => void;
}

export function NicknameScreen({ onSubmit }: Props) {
    const [value, setValue] = useState("");

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const name = value.trim();
        if (name) onSubmit(name);
    }

    return (
        <div className="lobby-center">
            <h1>Card Games</h1>
            <form onSubmit={submit} className="nickname-form">
                <input
                    autoFocus
                    placeholder="Your nickname"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    maxLength={20}
                />
                <button type="submit" disabled={!value.trim()}>Enter Lobby</button>
            </form>
        </div>
    );
}
