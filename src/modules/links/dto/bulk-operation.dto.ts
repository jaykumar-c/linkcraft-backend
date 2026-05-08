import {
  IsArray,
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
} from "class-validator";

export enum BulkAction {
  DELETE = "delete",
  ARCHIVE = "archive",
  ACTIVATE = "activate",
  DEACTIVATE = "deactivate",
  RESTORE = "restore",
}

export class BulkOperationDto {
  @IsArray()
  @IsString({ each: true })
  linkIds: string[];

  @IsEnum(BulkAction)
  action: BulkAction;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
