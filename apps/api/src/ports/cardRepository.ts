export interface CardRecord {
  id: string;
  userId: string;
  qrId: string | null;
  name: string;
  widthCm: number;
  heightCm: number;
  bleedMm: number;
  isDoubleSided: boolean;
  frontCanvasJson: unknown;
  backCanvasJson: unknown | null;
  thumbnailUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardDto {
  id: string;
  name: string;
  qrId: string | null;
  widthCm: number;
  heightCm: number;
  bleedMm: number;
  isDoubleSided: boolean;
  frontCanvasJson: unknown;
  backCanvasJson: unknown | null;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toCardDto(record: CardRecord): CardDto {
  return {
    id: record.id,
    name: record.name,
    qrId: record.qrId,
    widthCm: record.widthCm,
    heightCm: record.heightCm,
    bleedMm: record.bleedMm,
    isDoubleSided: record.isDoubleSided,
    frontCanvasJson: record.frontCanvasJson,
    backCanvasJson: record.backCanvasJson,
    thumbnailUrl: record.thumbnailUrl,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export interface CreateCardData {
  userId: string;
  name: string;
  qrId: string | null;
  widthCm: number;
  heightCm: number;
  bleedMm: number;
  isDoubleSided: boolean;
  frontCanvasJson: unknown;
  backCanvasJson: unknown | null;
  thumbnailUrl: string | null;
}

export interface UpdateCardData {
  name?: string;
  qrId?: string | null;
  widthCm?: number;
  heightCm?: number;
  bleedMm?: number;
  isDoubleSided?: boolean;
  frontCanvasJson?: unknown;
  backCanvasJson?: unknown | null;
  thumbnailUrl?: string | null;
}

export interface CardRepository {
  list(userId: string): Promise<CardRecord[]>;
  findById(userId: string, id: string): Promise<CardRecord | null>;
  create(data: CreateCardData): Promise<CardRecord>;
  update(userId: string, id: string, data: UpdateCardData): Promise<CardRecord | null>;
  delete(userId: string, id: string): Promise<boolean>;
}
