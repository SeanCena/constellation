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
            drawStarChartBackground(
                context,
                props.zoom,
                props.offsetX,
                props.offsetY
                );

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

function drawStars(ctx, canvasData, highlight, zoom, offsetX, offsetY, color_s=STAR_COLOR, color_h=HIGHLIGHT_COLOR, color_g=GLOW_COLOR) {
    // Draw all stars in canvasData, and highlight cluster if applicable
    canvasData.data.forEach((cluster) => {
        color_s = cluster.color;
        cluster.artists.forEach((artist) => {
            const x = artist.coordinates[0];
            const y = artist.coordinates[1];
            const scale = artist.size;
            // Can potentially do something with custom colors? And/or glow?
            if (cluster.id == highlight) {
                drawGlowingStar(ctx, x, y, zoom, offsetX, offsetY, scale, color_s, color_h, 4);
            } else {
                drawGlowingStar(ctx, x, y, zoom, offsetX, offsetY, scale, color_s, color_g, 2);
            }
        });
    });

}

function drawStarChartBackground(ctx, zoom, offsetX, offsetY) {
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
  
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(zoom, zoom);
    ctx.translate(offsetX, offsetY);
  
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1 / zoom;

    const borderRadius = 1300;
    const spacing = Math.round(borderRadius/5);
  
    // Draw concentric circles
    for (let radius = spacing; radius < 5 * spacing; radius += spacing) {
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
  
    // Draw radial lines
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * borderRadius, Math.sin(angle) * borderRadius);
        ctx.stroke();
    }
  
    // Draw ornate border
    ctx.beginPath();
    ctx.arc(0, 0, borderRadius, 0, Math.PI * 2);
    ctx.stroke();
  
    // Add ornate details to the border
    for (let i = 0; i < 72; i++) {
        const angle = (i / 72) * Math.PI * 2;
        const innerRadius = borderRadius - 5;
        const outerRadius = borderRadius + 5;
        ctx.beginPath();
        ctx.arc(0, 0, innerRadius, angle, angle + Math.PI / 72);
        ctx.arc(0, 0, outerRadius, angle + Math.PI / 72, angle, true);
        ctx.closePath();
        ctx.fill();
    }
  
    ctx.restore();
}

export default StarCanvas;