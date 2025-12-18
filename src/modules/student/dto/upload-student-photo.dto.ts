import { ApiProperty } from '@nestjs/swagger';

export class UploadStudentPhotoDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'فایل عکس هنرجو (۳x۴، JPEG/PNG، حداکثر 200KB)',
  })
  photo: any;
}
