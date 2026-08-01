import React, { useEffect, useState } from 'react';

function BloodDropCursor() {
  const [drops, setDrops] = useState([]);

  useEffect(() => {
    let lastDropTime = 0;

    const handleMouseMove = (e) => {
      const now = Date.now();
      // Add a new drop every 150ms if mouse is moving
      if (now - lastDropTime > 100) {
        setDrops((prevDrops) => [
          ...prevDrops,
          {
            id: now,
            x: e.clientX,
            y: e.clientY,
            size: Math.random() * 4 + 4, // 4px to 8px
            offsetX: (Math.random() - 0.5) * 10,
          }
        ]);
        lastDropTime = now;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Cleanup drops after they animate
    const cleanupInterval = setInterval(() => {
      setDrops((prevDrops) => {
        const now = Date.now();
        // Remove drops older than 1 second (duration of animation)
        return prevDrops.filter(drop => now - drop.id < 1000);
      });
    }, 500);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(cleanupInterval);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {drops.map((drop) => (
        <div
          key={drop.id}
          className="absolute rounded-full bg-rose-600/80 drop-shadow-sm"
          style={{
            left: drop.x + drop.offsetX,
            top: drop.y,
            width: `${drop.size}px`,
            height: `${drop.size * 1.5}px`, // Slight teardrop stretch
            borderTopLeftRadius: '50%',
            borderTopRightRadius: '50%',
            borderBottomLeftRadius: '50%',
            borderBottomRightRadius: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'bloodDropFall 1s ease-in forwards',
          }}
        >
          {/* SVG for a teardrop shape to make it look more like a drop than an oval */}
          <svg
            viewBox="0 0 30 42"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full text-rose-600"
            style={{ transform: 'scale(1.5)', opacity: 0.8 }}
          >
            <path d="M15 0C15 0 0 18 0 27C0 35.2843 6.71573 42 15 42C23.2843 42 30 35.2843 30 27C30 18 15 0 15 0Z" />
          </svg>
        </div>
      ))}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes bloodDropFall {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, calc(-50% + 40px)) scale(0);
            opacity: 0;
          }
        }
      `}} />
    </div>
  );
}

export default BloodDropCursor;
