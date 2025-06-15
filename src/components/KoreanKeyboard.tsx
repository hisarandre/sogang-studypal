import React, { useState, useRef, useEffect } from 'react';

interface KoreanKeyboardProps {
  onKeyPress: (char: string) => void;
  onSpace: () => void;
  onReturn: () => void;
  onBackspace: () => void;
  disabled?: boolean;
  isCorrect?: boolean;
  isIncorrect?: boolean;
}

const KoreanKeyboard: React.FC<KoreanKeyboardProps> = ({
  onKeyPress,
  onSpace,
  onReturn,
  onBackspace,
  disabled,
  isCorrect,
  isIncorrect,
}) => {
  const [shiftActive, setShiftActive] = useState(false);
  const audioContext = useRef<AudioContext | null>(null);
  const prevCorrectRef = useRef(isCorrect);
  const prevIncorrectRef = useRef(isIncorrect);

  // Effect to play sounds when correctness changes
  useEffect(() => {
    if (isCorrect && !prevCorrectRef.current) {
      playCorrectSound();
    }
    if (isIncorrect && !prevIncorrectRef.current) {
      playIncorrectSound();
    }
    prevCorrectRef.current = isCorrect;
    prevIncorrectRef.current = isIncorrect;
  }, [isCorrect, isIncorrect]);

  const unshiftedKeys = {
    top: ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ'],
    middle: ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'],
    bottom: ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ'],
  };

  const shiftedKeys = {
    top: ['ㅃ', 'ㅉ', 'ㄸ', 'ㄲ', 'ㅆ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅒ', 'ㅖ'], // Shifted characters for top row
    middle: ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'], // No shifted counterparts for these in Dubeolsik
    bottom: ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ'], // No shifted counterparts for these in Dubeolsik
  };

  const initAudioContext = () => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext.current;
  };

  const playClickSound = () => {
    const ctx = initAudioContext();

    // Create a noise buffer
    const bufferSize = ctx.sampleRate * 0.1; // 100ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate noise with quick decay
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-30 * i / bufferSize);
    }

    // Create noise source
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Create click oscillator
    const click = ctx.createOscillator();
    click.type = 'sine';
    click.frequency.value = 1500;

    // Create gain nodes for volume control
    const noiseGain = ctx.createGain();
    const clickGain = ctx.createGain();
    noiseGain.gain.value = 0.1;
    clickGain.gain.value = 0.05;

    // Create filters for better sound
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 2000;
    noiseFilter.Q.value = 1;

    const clickFilter = ctx.createBiquadFilter();
    clickFilter.type = 'highpass';
    clickFilter.frequency.value = 1000;

    // Connect everything
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    click.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(ctx.destination);

    // Start and stop sounds
    noise.start();
    click.start();
    noise.stop(ctx.currentTime + 0.05);
    click.stop(ctx.currentTime + 0.02);

    // Cleanup
    noise.onended = () => {
      noise.disconnect();
      noiseFilter.disconnect();
      noiseGain.disconnect();
    };
    click.onended = () => {
      click.disconnect();
      clickFilter.disconnect();
      clickGain.disconnect();
    };
  };

  const playCorrectSound = () => {
    const ctx = initAudioContext();
    
    // Create a modern "success" sound using filtered noise and harmonics
    const noise = ctx.createBufferSource();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    // Create noise buffer
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-20 * i / bufferSize);
    }
    noise.buffer = buffer;
    
    // Harmonic tones
    osc1.type = 'sine';
    osc1.frequency.value = 1200;
    osc2.type = 'sine';
    osc2.frequency.value = 1800;
    
    // Filter for modern sound
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 2;
    
    // Volume envelope
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
    
    // Connect everything
    noise.connect(filter);
    filter.connect(gain);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    
    // Start and stop
    noise.start();
    osc1.start();
    osc2.start();
    noise.stop(ctx.currentTime + 0.2);
    osc1.stop(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 0.2);
    
    // Cleanup
    noise.onended = () => {
      noise.disconnect();
      filter.disconnect();
      osc1.disconnect();
      osc2.disconnect();
      gain.disconnect();
    };
  };

  const playIncorrectSound = () => {
    const ctx = initAudioContext();
    
    // Create a modern "error" sound using filtered noise
    const noise = ctx.createBufferSource();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    // Create noise buffer
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-15 * i / bufferSize);
    }
    noise.buffer = buffer;
    
    // Subtle tone
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.15);
    
    // Filter for modern sound
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 1.5;
    
    // Volume envelope
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
    
    // Connect everything
    noise.connect(filter);
    filter.connect(gain);
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Start and stop
    noise.start();
    osc.start();
    noise.stop(ctx.currentTime + 0.15);
    osc.stop(ctx.currentTime + 0.15);
    
    // Cleanup
    noise.onended = () => {
      noise.disconnect();
      filter.disconnect();
      osc.disconnect();
      gain.disconnect();
    };
  };

  const handleButtonClick = (char: string) => {
    if (!disabled) {
      playClickSound();
      let charToSend = char;
      if (shiftActive) {
        const topIndex = unshiftedKeys.top.indexOf(char);
        if (topIndex !== -1) {
          charToSend = shiftedKeys.top[topIndex];
        }
      }
      onKeyPress(charToSend);
      setShiftActive(false);
    }
  };

  const handleSpecialKeyClick = (action: () => void) => {
    if (!disabled) {
      playClickSound();
      action();
    }
  };

  const toggleShift = () => {
    setShiftActive((prev) => !prev);
  };

  const getDisplayChar = (char: string, row: 'top' | 'middle' | 'bottom') => {
    if (shiftActive) {
      const unshiftedRow = unshiftedKeys[row];
      const shiftedRow = shiftedKeys[row];
      const index = unshiftedRow.indexOf(char);
      if (index !== -1 && shiftedRow[index] !== char) {
        return shiftedRow[index];
      }
    }
    return char;
  };

  return (
    <div className="flex flex-col items-center p-4">
      <div className="grid grid-cols-10 gap-2 mb-2">
        {unshiftedKeys.top.map((char) => (
          <button
            key={char}
            onClick={() => handleButtonClick(char)}
            className="flex items-center justify-center w-10 h-10 bg-white rounded-md shadow-sm text-lg font-medium text-gray-800 active:bg-primary/10 disabled:opacity-50"
            disabled={disabled}
          >
            {getDisplayChar(char, 'top')}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-9 gap-2 mb-2 w-full pl-6 pr-6">
        {unshiftedKeys.middle.map((char) => (
          <button
            key={char}
            onClick={() => handleButtonClick(char)}
            className="flex items-center justify-center w-10 h-10 bg-white rounded-md shadow-sm text-lg font-medium text-gray-800 active:bg-primary/10 disabled:opacity-50"
            disabled={disabled}
          >
            {getDisplayChar(char, 'middle')}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 mb-2 w-full pl-24 pr-24">
        {unshiftedKeys.bottom.map((char) => (
          <button
            key={char}
            onClick={() => handleButtonClick(char)}
            className="flex items-center justify-center w-10 h-10 bg-white rounded-md shadow-sm text-lg font-medium text-gray-800 active:bg-primary/10 disabled:opacity-50"
            disabled={disabled}
          >
            {getDisplayChar(char, 'bottom')}
          </button>
        ))}
      </div>
      <div className="flex gap-2 w-full mt-2">
        <button
          onClick={() => handleButtonClick('?')}
          className="flex items-center justify-center w-10 h-10 bg-white rounded-md shadow-sm text-lg font-medium text-gray-800 active:bg-primary/10 disabled:opacity-50"
          disabled={disabled}
        >
          ?
        </button>
        <button
          onClick={() => handleButtonClick('.')}
          className="flex items-center justify-center w-10 h-10 bg-white rounded-md shadow-sm text-lg font-medium text-gray-800 active:bg-primary/10 disabled:opacity-50"
          disabled={disabled}
        >
          .
        </button>
        <button
          onClick={() => handleButtonClick('!')}
          className="flex items-center justify-center w-10 h-10 bg-white rounded-md shadow-sm text-lg font-medium text-gray-800 active:bg-primary/10 disabled:opacity-50"
          disabled={disabled}
        >
          !
        </button>
        <button
          onClick={() => handleSpecialKeyClick(toggleShift)}
          className={`flex items-center justify-center w-16 h-10 bg-white rounded-md shadow-sm text-lg font-medium text-gray-800 ${shiftActive ? 'bg-primary/10' : 'active:bg-primary/10'} disabled:opacity-50`}
          disabled={disabled}
        >
          ⇧
        </button>

        <button
          onClick={() => handleSpecialKeyClick(onSpace)}
          className="flex-grow h-10 bg-white rounded-md shadow-sm text-lg font-medium text-gray-800 active:bg-gray-200 disabled:opacity-50"
          disabled={disabled}
        >
          space
        </button>
        <button
          onClick={() => handleSpecialKeyClick(onReturn)}
          className="flex items-center justify-center w-20 h-10 bg-white rounded-md shadow-sm text-lg font-medium text-gray-800 active:bg-gray-200 disabled:opacity-50"
          disabled={disabled}
        >
          return
        </button>
        <button
          onClick={() => handleSpecialKeyClick(onBackspace)}
          className="flex items-center justify-center w-10 h-10 bg-white rounded-md shadow-sm text-lg font-medium text-gray-800 active:bg-gray-200 disabled:opacity-50"
          disabled={disabled}
        >
          ⌫
        </button>
      </div>
    </div>
  );
};

export default KoreanKeyboard; 