// LottieLayer — putar animasi Lottie (JSON dari public/lottie/) sebagai
// lapisan efek di adegan Remotion: hujan, confetti, kilau, ombak, asap, dll.
// Deterministik per frame (digerakkan @remotion/lottie, bukan rAF bebas),
// jadi aman untuk render chunk di GitHub Actions.
//
// Pakai:
//   <LottieLayer file="confetti.json" style={{position:'absolute', inset:0}} />
// File JSON taruh di public/lottie/<file>. loop default true.
import React, {useEffect, useState} from 'react';
import {
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
} from 'remotion';
import {Lottie, type LottieAnimationData} from '@remotion/lottie';

type Props = {
  file: string;
  loop?: boolean;
  playbackRate?: number;
  direction?: 'forward' | 'backward';
  style?: React.CSSProperties;
};

export const LottieLayer: React.FC<Props> = ({
  file,
  loop = true,
  playbackRate = 1,
  direction = 'forward',
  style,
}) => {
  const [handle] = useState(() => delayRender(`lottie:${file}`));
  const [data, setData] = useState<LottieAnimationData | null>(null);

  useEffect(() => {
    fetch(staticFile(`lottie/${file}`))
      .then((r) => {
        if (!r.ok) throw new Error(`Lottie ${file}: HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        setData(json as LottieAnimationData);
        continueRender(handle);
      })
      .catch((e) => cancelRender(e));
  }, [file, handle]);

  if (!data) return null;
  return (
    <Lottie
      animationData={data}
      loop={loop}
      playbackRate={playbackRate}
      direction={direction}
      style={style}
    />
  );
};
