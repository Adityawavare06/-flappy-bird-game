"use client"; 
import { useEffect, useRef, useState } from "react";
import React from "react";

const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const BIRD_SIZE = 30;
const GRAVITY = 0.4;
const JUMP_HEIGHT = 7;
const PIPE_WIDTH = 60;
const PIPE_GAP = 160;
const PIPE_SPEED = 2;

function getRandomPipeY() {
  // Minimum pipe top is 60, max is GAME_HEIGHT - PIPE_GAP - 60
  return 60 + Math.random() * (GAME_HEIGHT - PIPE_GAP - 120);
}

export default function FlappyBird() {
  const [birdY, setBirdY] = useState(GAME_HEIGHT / 2 - BIRD_SIZE / 2);
  const [velocity, setVelocity] = useState(0);
  const [pipes, setPipes] = useState([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const requestRef = useRef();
  const audioRef = useRef();

  // Initialize pipes only on client side to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
    setPipes([
      { x: GAME_WIDTH + 100, y: getRandomPipeY() },
      { x: GAME_WIDTH + 100 + 200, y: getRandomPipeY() },
    ]);
  }, []);

  // Game loop
  useEffect(() => {
    if (!started || gameOver) return;
    const animate = () => {
      setBirdY((prev) => {
        const next = prev + velocity;
        if (next < 0) return 0;
        if (next > GAME_HEIGHT - BIRD_SIZE) return GAME_HEIGHT - BIRD_SIZE;
        return next;
      });
      setVelocity((v) => v + GRAVITY);
      setPipes((prevPipes) => {
        let newPipes = prevPipes.map((pipe) => ({ ...pipe, x: pipe.x - PIPE_SPEED }));
        // If pipe is off screen, reset it
        if (newPipes[0].x < -PIPE_WIDTH) {
          newPipes[0] = {
            x: newPipes[1].x + 200,
            y: getRandomPipeY(),
          };
        }
        if (newPipes[1].x < -PIPE_WIDTH) {
          newPipes[1] = {
            x: newPipes[0].x + 200,
            y: getRandomPipeY(),
          }; 
        }
        return newPipes;
      });
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [started, gameOver, velocity]);

  // Collision and scoring
  useEffect(() => {
    if (!started || gameOver) return;
    // Bird box
    const birdBox = {
      top: birdY,
      bottom: birdY + BIRD_SIZE,
      left: 60,
      right: 60 + BIRD_SIZE,
    };
    pipes.forEach((pipe, idx) =>{
      // Top pipe
      const topPipeBox = {
        top: 0,
        bottom: pipe.y,
        left: pipe.x,
        right: pipe.x + PIPE_WIDTH,
      };
      // Bottom pipe
      const bottomPipeBox = {
        top: pipe.y + PIPE_GAP,
        bottom: GAME_HEIGHT,
        left: pipe.x,
        right: pipe.x + PIPE_WIDTH,
      };
      // Collision
      if (
        (birdBox.right > topPipeBox.left &&
          birdBox.left < topPipeBox.right &&
          birdBox.top < topPipeBox.bottom) ||
        (birdBox.right > bottomPipeBox.left &&
          birdBox.left < bottomPipeBox.right &&
          birdBox.bottom > bottomPipeBox.top)
      ) {
        setGameOver(true);
      }
      // Score
      if (
        !gameOver &&
        pipe.x + PIPE_WIDTH < birdBox.left &&
        !pipe.passed
      ) {
        pipe.passed = true;
        setScore((s) => s + 1);
      }
    });
    // Ground/ceiling
    if (birdY >= GAME_HEIGHT - BIRD_SIZE || birdY <= 0) {
      setGameOver(true);
    }
  }, [birdY, pipes, gameOver, started]);

  // Handle jump
  const jump = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
    if (!started) {
      setStarted(true);
      setGameOver(false);
      setScore(0);
      setBirdY(GAME_HEIGHT / 2 - BIRD_SIZE / 2);
      setVelocity(-JUMP_HEIGHT);
      setPipes([
        { x: GAME_WIDTH + 100, y: getRandomPipeY() },
        { x: GAME_WIDTH + 100 + 200, y: getRandomPipeY() },
      ]);
      return;
    }
    if (!gameOver) setVelocity(-JUMP_HEIGHT);
  };

  // Keyboard and click controls
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (gameOver) {
          // Restart game when space is pressed after game over
          setStarted(false);
          setGameOver(false);
          setScore(0);
          setBirdY(GAME_HEIGHT / 2 - BIRD_SIZE / 2);
          setVelocity(0);
          setPipes([
            { x: GAME_WIDTH + 100, y: getRandomPipeY() },
            { x: GAME_WIDTH + 100 + 200, y: getRandomPipeY() },
          ]);
        } else {
          jump();
        }
      }
    };
    
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });



  // Don't render game content until client has hydrated
  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-200 to-blue-400">
        <div className="text-xl font-bold text-blue-900">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-200 to-blue-400">
      {/* Nav Bar */}
      <nav className="w-full flex items-center justify-center bg-blue-900 text-white py-3 shadow-lg fixed top-0 left-0 z-20">
        <div className="text-xl font-bold tracking-wide">Flappy Bird</div>
        <div className="ml-8 text-lg font-mono">Score: <span className="font-bold">{score}</span></div>
      </nav>
      <div className="h-16" /> {/* Spacer for nav bar */}
      {/* Hen Sound Audio */}
      <audio ref={audioRef} src="/hen.mp4" preload="auto" />
      <div
        className="relative border-4 border-blue-900 rounded-lg bg-blue-100 overflow-hidden shadow-lg"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
        onClick={jump}
      >
        {/* Bird (more bird-like) */}
        <div
          className="absolute"
          style={{
            width: BIRD_SIZE,
            height: BIRD_SIZE,
            left: 60,
            top: birdY,
          }}
        >
          {/* Body */}
          <div className="w-full h-full bg-yellow-400 border-2 border-yellow-600 rounded-full relative shadow-lg" />
          {/* White Belly */}
          <div className="absolute left-2 bottom-1 w-4 h-4 bg-white rounded-b-full z-20 opacity-90" />
          {/* Beak */}
          <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-3 h-2 bg-orange-400 rounded-r-full border-l-2 border-orange-600 z-10" />
          {/* Wattle (under beak) */}
          <div className="absolute right-[-6px] top-2 w-2 h-2 bg-red-500 rounded-full z-20" />
          {/* Comb (on head) */}
          <div className="absolute right-3 top-[-7px] w-2 h-2 bg-red-500 rounded-full z-30" />
          <div className="absolute right-5 top-[-9px] w-1.5 h-1.5 bg-red-400 rounded-full z-30" />
          {/* Eye */}
          <div className="absolute right-3 top-3 w-2 h-2 bg-white rounded-full border border-black z-20 flex items-center justify-center">
            <div className="w-1 h-1 bg-black rounded-full" />
          </div>
          {/* Left Wing */}
          <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-5 h-2 bg-yellow-200 rounded-full border border-yellow-400 rotate-[-30deg] z-0 shadow" />
          {/* Right Wing */}
          <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-5 h-2 bg-yellow-200 rounded-full border border-yellow-400 rotate-[30deg] z-0 shadow" />
          {/* Main Wing (center) */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-2 bg-yellow-300 rounded-full border border-yellow-500 rotate-[-20deg] z-10" />
          {/* Tail Feathers (3 colors) */}
          <div className="absolute left-[-10px] bottom-5 w-2 h-5 bg-yellow-500 rounded-full rotate-[-30deg] z-10" />
          <div className="absolute left-[-13px] bottom-3 w-2 h-4 bg-red-400 rounded-full rotate-[-45deg] z-10" />
          <div className="absolute left-[-7px] bottom-2 w-2 h-3 bg-blue-400 rounded-full rotate-[-10deg] z-10" />
          {/* Tail (triangle, base) */}
          <div className="absolute left-[-8px] bottom-3 w-0 h-0 border-t-4 border-b-4 border-r-8 border-t-transparent border-b-transparent border-r-yellow-500 rotate-[-20deg] z-10" />
        </div>
        {/* Pipes */}
        {pipes.map((pipe, idx) => (
          <div key={idx}>
            {/* Top tree (obstacle) */}
            <div
              className="absolute flex flex-col items-center"
              style={{  
                width: PIPE_WIDTH,
                height: pipe.y,
                left: pipe.x,
                top: 0,
              }}
            >
              {/* Trunk */}
              <div className="w-6 mx-auto bg-amber-900" style={{height: pipe.y - 30, borderRadius: '0 0 8px 8px'}} />
              {/* Leafy top */}
              <div className="w-14 h-8 bg-green-600 rounded-b-full border-2 border-green-800 -mt-2 shadow-lg" />
            </div>
            {/* Bottom tree (obstacle) */}
            <div
              className="absolute flex flex-col items-center"
              style={{
                width: PIPE_WIDTH,
                height: GAME_HEIGHT - pipe.y - PIPE_GAP,
                left: pipe.x,
                top: pipe.y + PIPE_GAP,
              }}
            >
              {/* Leafy base */}
              <div className="w-14 h-8 bg-green-600 rounded-t-full border-2 border-green-800 shadow-lg" />
              {/* Trunk */}
              <div className="w-6 mx-auto bg-amber-900" style={{height: (GAME_HEIGHT - pipe.y - PIPE_GAP) - 30, borderRadius: '8px 8px 0 0'}} />
            </div>
          </div>
        ))}
        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
            <div className="text-4xl font-bold text-white mb-2">Game Over</div>
            <div className="text-lg text-white mb-4">Score: {score}</div>
            <button
              className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold py-2 px-6 rounded-full shadow"
              onClick={() => {
                setStarted(false);
                setGameOver(false);
                setScore(0);
                setBirdY(GAME_HEIGHT / 2 - BIRD_SIZE / 2);
                setVelocity(0);
                setPipes([
                  { x: GAME_WIDTH + 100, y: getRandomPipeY() },
                  { x: GAME_WIDTH + 100 + 200, y: getRandomPipeY() },
                ]);
              }}
            >
              Restart
            </button>
          </div>
        )}
        {/* Start overlay */}
        {!started && !gameOver && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center z-10">
            <div className="text-3xl font-bold text-white mb-2">Click or press Space to start</div>
          </div>
        )}
      </div>
      <div className="mt-4 text-gray-700 text-sm">Click or press Space to jump</div>
      <div className="mt-2 text-gray-500 text-xs">Made with Next.js & Tailwind CSS</div>
    </div>
  );
}
