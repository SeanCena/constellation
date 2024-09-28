import React, { useRef, useImperativeHandle, useEffect, useState, forwardRef } from 'react';



const DEFAULT_STAR_SIZE = 7;
const STAR_COLOR = 'rgba(252, 252, 252, 1)';            // day neutral-n25
const GLOW_COLOR = 'rgba(145, 71, 204, 1)';           // dark background-accent
const HIGHLIGHT_COLOR = 'rgba(243, 240, 247, 1)';     // day special-background

interface Dimensions {
    width: number;
    height: number;
}

const StarCanvas: React.FC = forwardRef((props, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });

    useImperativeHandle(ref, () => ({
        canvasElement: canvasRef.current,
    }));

    useEffect(() => {
        const updateDimensions = (): void => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                setDimensions({ width, height });
            }
        };

        // Initial update
        updateDimensions();

        // Set up ResizeObserver
        const resizeObserver = new ResizeObserver(updateDimensions);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            if (containerRef.current) {
                resizeObserver.unobserve(containerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');

        if (canvas && context) {
            // Set canvas size
            canvas.width = dimensions.width;
            canvas.height = dimensions.height;

            // Draw background on the canvas (optional)

            // Draw points on the canvas
            drawStars(
                context,
                props.canvasData,
                props.highlight,
                props.zoom,
                props.offsetX,
                props.offsetY
                );
        }
    }, [dimensions, props]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
            <canvas
                ref={canvasRef}
                style={{ display: 'block', width: '100%', height: '100%' }}
            />
        </div>
    );
})

function drawGlowingStar(ctx, mapX, mapY, zoom, offsetX, offsetY, scale, starColor, glowColor, glowLevel) {
    // Convert map coordinates to canvas coordinates
    const canvasX = (mapX + offsetX) * zoom + ctx.canvas.width / 2;
    const canvasY = (-mapY + offsetY) * zoom + ctx.canvas.height / 2;

    // Define the absolute star size here
    const starSize = scale * DEFAULT_STAR_SIZE;

    // Save the current context state
    ctx.save();

    // Create a glowing effect
    ctx.shadowBlur = glowLevel * starSize;
    ctx.shadowColor = glowColor;

    // Begin the star path
    ctx.beginPath();
    ctx.translate(canvasX, canvasY);
    ctx.scale(zoom, zoom);

    // Draw the four-pointed star
    for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.lineTo(starSize, 0);
        ctx.lineTo(starSize / 3, starSize / 3);
    }

    // Close the path and fill the star
    ctx.closePath();
    ctx.fillStyle = starColor;
    ctx.fill();

    // Restore the context state
    ctx.restore();
}

function drawStars(ctx, canvasData, highlight, zoom, offsetX, offsetY) {
    // Draw all stars in canvasData, and highlight cluster if applicable
    canvasData.data.forEach((cluster) => {
        cluster.artists.forEach((artist) => {
            const x = artist.coordinates[0];
            const y = artist.coordinates[1];
            const scale = artist.size;
            // Can potentially do something with custom colors? And/or glow?
            if (cluster.id == highlight) {
                drawGlowingStar(ctx, x, y, zoom, offsetX, offsetY, scale, STAR_COLOR, HIGHLIGHT_COLOR, 3);
            } else {
                drawGlowingStar(ctx, x, y, zoom, offsetX, offsetY, scale, STAR_COLOR, GLOW_COLOR, 1);
            }
        });
    });
}

export default StarCanvas;