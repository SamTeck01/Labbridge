import React from 'react';
import { Composition } from 'remotion';
import { Ad } from './Ad';
import T from './timeline.json';

export const Root: React.FC = () => (
  <>
    <Composition id="LabBridgeAd" component={Ad} durationInFrames={Math.round(T.total * T.fps)} fps={T.fps} width={1920} height={1080} defaultProps={{ vertical: false }} />
    <Composition id="LabBridgeAdVertical" component={Ad} durationInFrames={Math.round(T.total * T.fps)} fps={T.fps} width={1080} height={1920} defaultProps={{ vertical: true }} />
  </>
);
