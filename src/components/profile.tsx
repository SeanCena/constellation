import React, { useState, useEffect } from 'react'
import { sdk, full as FullSdk } from '@audius/sdk'
import {
    ThemeProvider as HarmonyThemeProvider,
    Hint,
    Paper,
    Box,
    Text,
    TextInput,
    TextInputSize
} from '@audius/harmony'
import {
    IconAudiusLogoColor,
    IconInfo,
    IconPlus,
    IconMinus,
    IconCaretLeft,
    IconPause,
    IconPlay
} from '@audius/harmony'
import { Button, Flex, Avatar } from '@audius/harmony'



const audiusSdk = sdk({
    appName: 'Constellation',
    apiKey: "4b752626210aa79e6db4010815c952ccffffd937"
})

const LeaderboardProfile = (props) => {
    const [handle, setHandle] = useState('');
    const [pfp, setPfp] = useState('');
    const [href, setHref] = useState('https://audius.co');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const {data: user} = await audiusSdk.users.getUser({
                    id: props.userId,
                });
                setHandle('@' + user.handle);
                if (user.profilePicture !== undefined) { setPfp(user.profilePicture._480x480); }
                setHref('https://audius.co/' + user.handle);
            } catch (e) {
                setHandle('User not found');
            }
        };
        fetchData();
    }, [props]);

    return (
        <Button variant='tertiary' onClick={()=> window.open(href, "_blank")} style={{width:'100%'}}>
            <Flex direction='row' gap='l' justifyContent='flex-start' alignItems='center'>
                {/* Profile picture */}
                <Avatar src={pfp} size='medium'></Avatar>
                {/* Handle */}
                <Text variant='title' color='default' size='l' strength='weak'>{handle}</Text>
            </Flex>
        </Button>
    );
}

const PreviewProfile = (props) => {
    const [handle, setHandle] = useState('');
    const [pfp, setPfp] = useState('');
    const [bio, setBio] = useState('');
    const [href, setHref] = useState('https://audius.co');

    useEffect(() => {
        setHandle('');
        setPfp('');
        setBio('');
        setHref('https://audius.co');
        const fetchData = async () => {
            try {
                const {data: user} = await audiusSdk.users.getUser({
                    id: props.userId,
                });
                setHandle('@' + user.handle);
                if (user.profilePicture !== undefined) { setPfp(user.profilePicture._480x480); }
                if (user.bio !== undefined) {
                    if (user.bio.length > 120) {
                        setBio(user.bio.substring(0, 120) + '...');
                    } else {
                        setBio(user.bio);
                    }
                }
                setHref('https://audius.co/' + user.handle);
            } catch (e) {
                console.log(e.message);
                setHandle('User not found');
            }
        };
        fetchData();
    }, [props.userId]);

    return (
        <Paper direction='column' justifyContent='center' alignItems='center'
            gap='l' p='l' w='350px'
            backgroundColor='white' borderRadius='s'
            style={{position:'absolute', left:props.x, top:props.y, cursor:'pointer'}}
            onClick={()=> window.open(href, "_blank")}>
            <Flex direction='row' gap='l' justifyContent='flex-start' alignItems='center'>
                {/* Profile picture */}
                <Avatar src={pfp} size='medium'></Avatar>
                {/* Handle */}
                <Text variant='title' color='default' size='l' strength='weak'>{handle}</Text>
            </Flex>
            {/* Body */}
            <Text variant='body' color='default' size='l' strength='weak'>{bio}</Text>
        </Paper>
    );
}

export {LeaderboardProfile, PreviewProfile}