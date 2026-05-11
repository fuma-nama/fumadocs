export type Generated = {
  optimizeDeps: {
    include: string[];
    exclude: string[];
  };

  ssr: {
    noExternal: string[];
  };
};
