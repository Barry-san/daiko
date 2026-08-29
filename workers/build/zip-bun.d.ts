declare module "zip-bun" {
  export function extractArchive(zipFile: string, outputDir: string): Promise<void>;

  export function createArchive(filename?: string): ZipArchiveWriter;
  export function openArchive(filename: string): ZipArchiveReader;

  interface ZipFile {
    filename: string;
    comment: string;
    uncompressedSize: number;
    compressedSize: number;
    directory: boolean;
    encrypted: boolean;
  }

  interface ZipArchiveReader {
    files(): ZipFile[];
    getFileCount(): number;
    getFileByIndex(index: number): ZipFile;
    extractFile(index: number): Uint8Array;
    extractFileByName(filename: string): Uint8Array;
    close(): boolean;
  }

  interface ZipArchiveWriter {
    addFile(filename: string, data: Uint8Array | ArrayBufferLike, compressionLevel?: number): boolean;
    finalize(): boolean;
  }
}
