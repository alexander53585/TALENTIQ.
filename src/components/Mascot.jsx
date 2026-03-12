import React from 'react';
import { C } from './tokens';

/**
 * Mascot Component (Ray)
 * @param {string} state - idle | listening | thinking | speaking
 * @param {number} size - size in pixels
 */
export default function Mascot({ state = 'idle', size = 80 }) {
  const isSpeaking = state === 'speaking';
  const isThinking = state === 'thinking';
  const isListening = state === 'listening';

  return (
    <div style={{
      width: size,
      height: size,
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <style>
        {`
          @keyframes ray-float {
            0%, 100% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(-5px) scale(1.02); }
          }
          @keyframes ray-glow {
            0%, 100% { filter: drop-shadow(0 0 8px ${C.primary}40); }
            50% { filter: drop-shadow(0 0 20px ${C.primary}80); }
          }
          @keyframes ray-eye-blink {
            0%, 90%, 100% { transform: scaleY(1); }
            95% { transform: scaleY(0.1); }
          }
          @keyframes ray-mouth-talk {
            0%, 100% { transform: scaleX(1); opacity: 0.5; }
            50% { transform: scaleX(1.5); opacity: 1; }
          }
          @keyframes ray-thinking-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes ray-base-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }

          .ray-container {
            animation: ray-float 4s infinite ease-in-out;
            will-change: transform;
          }
          .ray-body {
            fill: #fff;
            stroke: ${C.primary};
            stroke-width: 2;
            transition: all 0.5s ease;
          }
          .ray-eye {
            fill: ${C.text};
            animation: ray-eye-blink 5s infinite;
          }
          .ray-mouth {
            stroke: ${C.primary};
            stroke-width: 2;
            stroke-linecap: round;
            fill: none;
            transition: all 0.3s ease;
          }
          .ray-halo {
            fill: none;
            stroke: ${C.primaryLight};
            stroke-width: 1.5;
            stroke-dasharray: 4 4;
            opacity: 0.6;
          }
          .state-thinking .ray-halo {
            animation: ray-thinking-spin 2s infinite linear;
            opacity: 1;
            stroke-dasharray: none;
          }
          .state-speaking .ray-mouth {
            animation: ray-mouth-talk 0.2s infinite;
          }
          .state-listening .ray-container {
             animation: ray-base-pulse 1s infinite ease-in-out;
          }
        `}
      </style>

      <div className={`ray-container state-${state}`} style={{ width: '100%', height: '100%', animation: isThinking ? 'none' : '' }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          {/* External Glow/Halo */}
          <circle 
            cx="50" cy="50" r="45" 
            className="ray-halo"
            style={{ 
              stroke: isThinking ? C.secondary : isListening ? C.accent : C.primaryLight,
              transition: 'all 0.5s ease'
            }}
          />

          {/* Body Shape */}
          <path 
            d="M50 15 C70 15 85 30 85 50 C85 70 70 85 50 85 C30 85 15 70 15 50 C15 30 30 15 50 15 Z" 
            className="ray-body"
            style={{
              filter: isThinking ? `drop-shadow(0 0 12px ${C.secondary}80)` : `drop-shadow(0 0 8px ${C.primary}40)`
            }}
          />

          {/* Face */}
          <g transform="translate(0, 5)">
            {/* Eyes */}
            <circle cx="38" cy="42" r="4" className="ray-eye" />
            <circle cx="62" cy="42" r="4" className="ray-eye" />

            {/* Mouth */}
            {isSpeaking ? (
               <path d="M42 58 Q50 65 58 58" className="ray-mouth" />
            ) : isListening ? (
               <circle cx="50" cy="60" r="3" className="ray-mouth" style={{ fill: C.primaryLight }} />
            ) : (
               <path d="M44 60 L56 60" className="ray-mouth" />
            )}
          </g>

          {/* Decorative bits */}
          <circle cx="50" cy="22" r="2" fill={C.primaryLight} style={{ opacity: 0.5 }} />
        </svg>
      </div>
    </div>
  );
}
