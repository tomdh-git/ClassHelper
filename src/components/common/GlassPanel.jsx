/* eslint-disable react/prop-types */
import React from "react";
import FluidGlass from "./FluidGlass";

/**
 * Generic wrapper that renders a FluidGlass background behind arbitrary children.
 *
 * Usage:
 *   <GlassPanel as="section" className="panel-card">
 *     ...panel content...
 *   </GlassPanel>
 */
export default function GlassPanel({ as: Tag = "div", className = "", mode = "lens", lensProps, barProps, cubeProps, children, ...rest }) {
  const mergedLensProps = {
    scale: 0.25,
    ior: 1.15,
    thickness: 5,
    chromaticAberration: 0.1,
    anisotropy: 0.01,
    ...lensProps,
  };

  return (
    <Tag className={`${className} glass-panel`} {...rest}>
      <div className="glass-panel-bg">
        <FluidGlass
          mode={mode}
          lensProps={mergedLensProps}
          barProps={barProps}
          cubeProps={cubeProps}
        />
      </div>
      <div className="glass-panel-content">
        {children}
      </div>
    </Tag>
  );
}
