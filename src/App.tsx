import { MouseEventHandler, useEffect, useRef, useState } from 'react'

import { sdk, full as FullSdk } from '@audius/sdk'
import {
  GetTracksByUserSortDirectionEnum as sortTrackDirectionEnum,
  GetTracksByUserSortMethodEnum as sortTrackMethodEnum,
  GetTracksByUserFilterTracksEnum as filterTrackEnum
} from '@audius/sdk'
import {
  ThemeProvider as HarmonyThemeProvider,
  Hint,
  Paper,
  Box,
  Divider,
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
import { Button, Flex } from '@audius/harmony'
import { css } from '@emotion/react'
import StarCanvas from './components/canvas'
import {LeaderboardProfile, PreviewProfile} from './components/profile'

var bgColors = {    "Default": "#81b71a",
                    "Blue": "#00B1E1",
                    "Cyan": "#37BC9B",
                    "Green": "#8CC152",
                    "Red": "#E9573F",
                    "Yellow": "#F6BB42",
};


const audiusSdk = sdk({
  appName: 'Constellation',
  apiKey: "4b752626210aa79e6db4010815c952ccffffd937",
  // NOTE: In a real app, you should never expose your apiSecret to the client.
  // Instead, store the apiSecret on your server and make requests using @audius/sdk server side
})

const STATE_TOPLEVEL = 0;  // viewing top level clusters
const STATE_SUBLEVEL = 1;  // viewing subclusters

const MOUSE_THRESHOLD = 20;  // hover and click only register if they're within this many pixels of a canvas item

export default function App() {

  // App state
  const [appState, setAppState] = useState(STATE_TOPLEVEL);

  // Mouse states
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [prevClickX, setPrevClickX] = useState(0);
  const [prevClickY, setPrevClickY] = useState(0);

  // Popup states
  const [popupVis, setPopupVis] = useState(false);
  const [popupUserId, setPopupUserId] = useState('Wem1e');
  const [popupX, setPopupX] = useState(0);        // popup x pos relative to the map coords
  const [popupY, setPopupY] = useState(0);        // popup y pos relative to the map coords

  // Top info bar states
  const [backButtonVis, setBackButtonVis] = useState(false);
  const [infoTextVis, setInfoTextVis] = useState(false);
  const [infoText, setInfoText] = useState('');

  // Info panel states
  const [panelVis, setPanelVis] = useState(false);
  const [panelTitle, setPanelTitle] = useState('');
  const [panelArtists, setPanelArtists] = useState([]);

  // Freeze profile components (info panel and popup)
  const [freezeProfiles, setFreezeProfiles] = useState(false);

  // Canvas ref and states
  const canvasRef = useRef(null);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [prevOffsetX, setPrevOffsetX] = useState(0);
  const [prevOffsetY, setPrevOffsetY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [canvasData, setCanvasData] = useState({data: []});
  const [highlight, setHighlight] = useState('');

  // Audio ref and states
  const audioRef = useRef(null);
  const [audioSrc, setAudioSrc] = useState('');
  const [audioIsPlaying, setAudioIsPlaying] = useState(false);

  // Popup funcs
  function popupToCoords(x, y) {
    // Note: spawns a popup at x and y pos RELATIVE TO THE MAP'S COORDINATE SYSTEM
    const canvas = canvasRef.current.canvasElement;
    const h = canvas.height;
    const w = canvas.width;
    setPopupX(x);
    setPopupY(y);
    setPopupVis(true);
  }

  // Coordinate system translation funcs
  function mapToAbsX(x) {return canvasRef.current.canvasElement.width/2 + (x + offsetX) * zoom}
  function mapToAbsY(y) {return canvasRef.current.canvasElement.height/2 + 90 - (y - offsetY) * zoom}

  // Canvas manip funcs
  function zoomIn() {setZoom(zoom * 1.5)}
  function zoomOut() {setZoom(zoom / 1.5)}

  // Load new data in canvas
  const loadData = async (clusterId) => {
    // const url = "https://audiustest.s3.us-west-1.amazonaws.com/" + clusterId + '.json';
    const url = "https://raw.githubusercontent.com/SeanCena/audiusdata/refs/heads/main/" + clusterId + ".json";  // github for the demo
    const data = await fetch(url);
    const clusterData = await data.json();
    setCanvasData(clusterData);
  }

  // Given a coordinate pair, return which artist it is close to, along with their subcluster
  function closestArtist(x, y) {
    let ret = {artist: undefined, cluster: undefined};
    canvasData.data.forEach((cluster)=>{
      cluster.artists.forEach((artist)=>{
        const artistAbsX = mapToAbsX(artist.coordinates[0]);
        const artistAbsY = mapToAbsY(artist.coordinates[1]);
        if ((artistAbsX - x) ** 2 + (artistAbsY - y) ** 2 < MOUSE_THRESHOLD ** 2) {
          ret = {artist: artist, cluster: cluster};
          return;
        }
      })
    });
    return ret;
  }

  // Audio funcs
  const playTopTrack = async (userId) => {
    const topTracks = await audiusSdk.users.getTracksByUser({
      id: userId,
      limit: 1,
      filterTracks: filterTrackEnum.Public,
      sortDirection: sortTrackDirectionEnum.Desc,
      sortMethod: sortTrackMethodEnum.Plays
    });
    if (topTracks.data !== undefined) {
      if (topTracks.data.length > 0) {
        // We got a top track, so play it
        const topTrack = topTracks.data[0];
        const trackStreamUrl = await audiusSdk.tracks.streamTrack({trackId: topTrack.id});
        setAudioSrc(trackStreamUrl);
        setAudioIsPlaying(true);
        return;  // to avoid the function call to stop playing below
      }
    }
    setAudioIsPlaying(false);  // couldn't get a top track, so stop the player
  };

  // Responding to audio state changes
  useEffect(() => {
    if (audioIsPlaying && audioRef.current?.src) {
      audioRef.current.volume = 0.5;
      audioRef.current?.play()
    } else {
      audioRef.current?.pause()
    }
  }, [audioIsPlaying]);

  // Responding to zoom and offset state changes
  useEffect(() => {
    if (popupVis) popupToCoords(popupX, popupY); // move the popup
  }, [zoom, offsetX, offsetY]);

  // Using overall app state to control certain UI elements
  useEffect(() => {
    // offsets and zoom go back to normal regardless of the state
    setOffsetX(0);
    setOffsetY(0);
    setZoom(1);
    switch(appState){
      case STATE_TOPLEVEL:
        // show: top level clusters
        // hide: back button, info text, audio
        loadData("cluster_0");
        setBackButtonVis(false);
        setInfoTextVis(false);
        setAudioIsPlaying(false);
        break;
      case STATE_SUBLEVEL:
        // show: back button, info text
        // hide: audio
        setBackButtonVis(true);
        setInfoTextVis(true);
        setAudioIsPlaying(false);
        break;
    }
  }, [appState]);

  return (
    <HarmonyThemeProvider theme='dark'>
      
      {/* Big container for everything */}
      <Flex direction='column' alignItems='center' h='100%' onMouseUp={()=>setIsMouseDown(false)}>

        {/* Header */}
        <Flex direction='row' justifyContent='center' alignItems='center'
              gap='s' h='90px' w='100%' shadow='mid' style={{zIndex:10}}
              backgroundColor='white'>
          <IconAudiusLogoColor></IconAudiusLogoColor>
          <Text variant='display' color='heading' size='s' strength='weak'>CONSTELLATIONS</Text>
        </Flex>

        {/* Main container */}
        <Flex w='100%' h='calc(100vh - 90px)' backgroundColor='default'
        /* <Flex w='100%' h='calc(100vh - 90px)' backgroundColor={bgColors.Cyan} */
              onMouseDown={(e)=>{
                setIsMouseDown(true);
                setPrevClickX(e.pageX);
                setPrevClickY(e.pageY);
                setPrevOffsetX(offsetX);
                setPrevOffsetY(offsetY);
              }}
              onClick={(e)=>{
                // Check if clicking artist
                const artistInfo = closestArtist(e.pageX, e.pageY);
                const artist = artistInfo.artist;
                const cluster = artistInfo.cluster;
                switch (appState) {
                  case STATE_TOPLEVEL:
                    if (artist === undefined) {
                      // Nothing to do
                    } else {
                      // Go to that artist's cluster
                      loadData(cluster.id);
                      setAppState(STATE_SUBLEVEL);
                    }
                    break;
                  case STATE_SUBLEVEL:
                    if (artist === undefined) {
                      // Hide popup, stop audio
                      setPopupVis(false);
                      setAudioIsPlaying(false);
                      setFreezeProfiles(false);
                    } else {
                      // Show popup and keep it open, play artist's top track
                      setPopupUserId(artist.id);
                      popupToCoords(artist.coordinates[0], artist.coordinates[1]);
                      playTopTrack(artist.id);
                      setFreezeProfiles(true);
                    }
                    break;
                }
              }}
              onMouseMove={(e)=>{
                if (isMouseDown) {
                  // Click and drag
                  setOffsetX(prevOffsetX + (e.pageX - prevClickX) / zoom);
                  setOffsetY(prevOffsetY + (e.pageY - prevClickY) / zoom);
                } else {
                  // Check if hovering over artist
                  const artistInfo = closestArtist(e.pageX, e.pageY);
                  const artist = artistInfo.artist;
                  const cluster = artistInfo.cluster;
                  switch (appState) {
                    case STATE_TOPLEVEL:
                      if (artist === undefined) {
                        // Remove any highlights, hide side panel, hide info text, stop audio
                        setHighlight("");
                        setPanelVis(false);
                        setInfoTextVis(false);
                        setAudioIsPlaying(false);
                      } else {
                        // Highlight subcluster, show side panel, show info text, play top track from top artist
                        setHighlight(cluster.id);
                        // IZ: Put the top 5 artists and most obscure 2 artists on the side bar
                        var top_5_bottom_2 = [].concat(cluster.artists.slice(0, 5), cluster.artists.slice(-2));
                        setPanelArtists(top_5_bottom_2);  // only the top five artists make it to the info panel
                        setPanelTitle(cluster.name);
                        setPanelVis(true);
                        setInfoText(cluster.name);
                        setInfoTextVis(true);
                        playTopTrack(cluster.artists[0].id);
                      }
                      break;
                    case STATE_SUBLEVEL:
                      if (artist === undefined) {
                        // Hide popup, remove any highlights, hide side panel, stop audio
                        setPopupVis(freezeProfiles);
                        if (!freezeProfiles) setHighlight("");
                        setPanelVis(freezeProfiles);
                        if (!freezeProfiles) setAudioIsPlaying(false);
                      } else {
                        // Show popup, play audio, highlight subcluster, show side panel
                        if (!freezeProfiles) {
                          setPopupUserId(artist.id);
                          playTopTrack(artist.id);
                          popupToCoords(artist.coordinates[0], artist.coordinates[1]);
                          setHighlight(cluster.id);
                          // IZ: Put the top 5 artists and most obscure 2 artists on the side bar
                          var top_5_bottom_2 = [].concat(cluster.artists.slice(0, 5), cluster.artists.slice(-2));
                          setPanelArtists(top_5_bottom_2);  // only the top five artists make it to the info panel
                          setPanelTitle(cluster.name);
                          setPanelVis(true);
                        }
                      }
                      break;
                  }
                }
              }}>

          {/* Zoom buttons */}
          <Flex direction='column' justifyContent='center' alignItems='center'
                gap='xs' w='80px' p='l' style={{zIndex:2, position:'absolute', right:0}}>

            {zoom < 10 ? (
              // can't zoom in past 10x
              <Button size='small' variant='tertiary' onClick={zoomIn}><IconPlus color='default'></IconPlus></Button>
            ) : <Button size='small' variant='tertiary' disabled><IconPlus color='default'></IconPlus></Button>}
            
            {zoom > 0.1 ? (
              // can't zoom out past 0.1x
              <Button size='small' variant='tertiary' onClick={zoomOut}><IconMinus color='default'></IconMinus></Button>
            ) : <Button size='small' variant='tertiary' disabled><IconMinus color='default'></IconMinus></Button>}

          </Flex>

          {/* Top info text */}
          <Flex direction='row' justifyContent='center' alignItems='center'
                gap='l' w='100%' p='l' style={{zIndex:1, position:'absolute', top:0}}>

            {backButtonVis ? (
              <Button size='default' variant='tertiary' onClick={()=>setAppState(STATE_TOPLEVEL)}><IconCaretLeft size='l' color='default'></IconCaretLeft></Button>
            ) : <></>}

            {infoTextVis ? (
              <Text variant='title' color='default' size='l' strength='default'>{infoText}</Text>
            ) : <></>}

          </Flex>

          {/* Artist profile info */}
          {popupVis ? (
            <PreviewProfile userId={popupUserId} x={mapToAbsX(popupX) - 175 + 'px'} y={mapToAbsY(popupY) + 'px'} />
          ) : <></>}

          {/* Side info panel */}
          {panelVis ? (
          <Flex direction='column' justifyContent='center' alignItems='center'
                gap='xl' w='400px' p='l' style={{zIndex:1, position:'absolute', left:0}}>
            <Flex direction='column' justifyContent='flex-start' alignItems='center'
                  gap='l' w='100%' p='l'
                  backgroundColor='white' borderRadius='s'>
              <Text variant='title' color='heading' size='l' strength='default'>{panelTitle}</Text>
              <Text variant='title' color='active' size='1' strength='default'>{'Top Artists'}</Text>
              {panelArtists.slice(0,5).map((artist) => (
                <LeaderboardProfile userId={artist.id} key={artist.id}></LeaderboardProfile>
              ))}
              <Text variant='title' color='active' size='0.7' strength='default'>{'Fresh Faces'}</Text>
              {/* <Text variant='title' color='default' size='l' strength='default'>{'...'}</Text> */}
              {panelArtists.slice(-2).map((artist) => (
                <LeaderboardProfile userId={artist.id} key={artist.id}></LeaderboardProfile>
              ))}
            </Flex>
          </Flex>
          ) : <></>}

          {/* Canvas */}
          <StarCanvas ref={canvasRef}
                      zoom={zoom}
                      offsetX={offsetX} offsetY={offsetY}
                      canvasData={canvasData}
                      highlight={highlight} />

        </Flex>

      </Flex>

      {/* Playing music on hover over artist */}
      <audio
        css={{ display: 'none' }}
        src={audioSrc}
        ref={audioRef}
        autoPlay
      />

    </HarmonyThemeProvider>
  )
}