declare module "sharp" {
  interface Metadata {
    width?: number;
    height?: number;
    format?: string;
    hasAlpha?: boolean;
  }

  interface ChannelStats {
    mean: number;
  }

  interface Stats {
    channels: ChannelStats[];
  }

  interface Sharp {
    rotate(): Sharp;
    resize(width: number, height: number, options?: { fit?: string; position?: string }): Sharp;
    flatten(options?: { background?: string }): Sharp;
    composite(images: Array<{ input: Buffer; top?: number; left?: number; gravity?: string }>): Sharp;
    withMetadata(options?: { copyright?: string }): Sharp;
    jpeg(options?: { quality?: number; mozjpeg?: boolean; chromaSubsampling?: string }): Sharp;
    toBuffer(): Promise<Buffer>;
    metadata(): Promise<Metadata>;
    stats(): Promise<Stats>;
  }

  function sharp(input: Buffer): Sharp;
  export default sharp;
}
