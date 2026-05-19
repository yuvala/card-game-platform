import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { NicknameScreen } from './NicknameScreen';
import { RoomList } from './RoomList';

export function App() {
    const [userId, setUserId] = useState<string | null>(null);
    const [nickname, setNickname] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
                setUserId(data.session.user.id);
                setNickname(sessionStorage.getItem('nickname'));
            }
        });
    }, []);

    async function handleNickname(name: string) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error || !data.user) return;
        sessionStorage.setItem('nickname', name);
        setUserId(data.user.id);
        setNickname(name);
    }

    if (!userId || !nickname) {
        return <NicknameScreen onSubmit={handleNickname} />;
    }

    return <RoomList userId={userId} nickname={nickname} />;
}
