import React from 'react';
import { useTranslation } from 'react-i18next';
import { Ruler, CornerDownRight, Box } from 'lucide-react';
import { BoundingBox } from '../types';

interface MeasureToolProps {
  distance: number | null;
  point1: [number, number, number] | null;
  point2: [number, number, number] | null;
  boundingBox?: BoundingBox | null;
}

export const MeasureTool: React.FC<MeasureToolProps> = ({
  distance,
  point1,
  point2,
  boundingBox
}) => {
  const { t } = useTranslation();

  return (
    <div className="p-4 bg-dark-surface border border-cyan-500/30 rounded-xl flex flex-col gap-3 shadow-lg shadow-cyan-950/20">
      <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs tracking-wider uppercase">
        <Ruler className="w-4 h-4" />
        <span>3D Measurement Readout</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Point-to-point Distance */}
        <div className="bg-dark-panel p-3 rounded-lg border border-dark-border flex flex-col gap-1">
          <span className="text-slate-400 text-[11px]">Euclidean Distance</span>
          <div className="text-base font-mono font-bold text-cyan-300">
            {distance !== null ? `${distance} mm` : point1 ? "Click 2nd point..." : "Click model surface..."}
          </div>
          {point1 && (
            <div className="text-[10px] text-slate-400 font-mono">
              P1: [{point1.join(', ')}]
            </div>
          )}
          {point2 && (
            <div className="text-[10px] text-slate-400 font-mono">
              P2: [{point2.join(', ')}]
            </div>
          )}
        </div>

        {/* Bounding Box Dimensions */}
        {boundingBox && (
          <div className="bg-dark-panel p-3 rounded-lg border border-dark-border flex flex-col gap-1">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Box className="w-3 h-3 text-brand-400" />
              Bounding Box (L x W x H)
            </span>
            <div className="text-xs font-mono font-semibold text-slate-200">
              {boundingBox.size[0].toFixed(2)} × {boundingBox.size[1].toFixed(2)} × {boundingBox.size[2].toFixed(2)} mm
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate">
              Min: [{boundingBox.min.map(n => n.toFixed(1)).join(', ')}]
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
