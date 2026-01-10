import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Status } from '../entities/status.entity';
import { CreateStatusDto } from './dto/create-status.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { FilterStatusesDto } from './dto/filter-statuses.dto';
import { createPaginatedResponse, PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class StatusesService {
  constructor(
    @InjectRepository(Status)
    private statusRepository: Repository<Status>,
  ) {}

  async findAll(filters?: FilterStatusesDto): Promise<PaginatedResponse<Status>> {
    const queryBuilder = this.statusRepository
      .createQueryBuilder('status')
      .orderBy('status.sortOrder', 'ASC')
      .addOrderBy('status.name', 'ASC')
      .addOrderBy('status.createdAt', 'DESC');

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('status.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters?.applicableEntities && filters.applicableEntities.length > 0) {
      queryBuilder.andWhere('status.applicableEntities && :applicableEntities', {
        applicableEntities: filters.applicableEntities,
      });
    }

    if (filters?.color) {
      queryBuilder.andWhere('status.color = :color', { color: filters.color });
    }

    if (filters?.createdBy) {
      queryBuilder.andWhere('status.createdBy = :createdBy', {
        createdBy: filters.createdBy,
      });
    }

    if (filters?.assignedTo) {
      queryBuilder.andWhere('status.assignedTo = :assignedTo', {
        assignedTo: filters.assignedTo,
      });
    }

    if (filters?.code) {
      queryBuilder.andWhere('status.code ILIKE :code', {
        code: `%${filters.code}%`,
      });
    }

    if (filters?.name) {
      queryBuilder.andWhere('status.name ILIKE :name', {
        name: `%${filters.name}%`,
      });
    }

    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string): Promise<Status> {
    const status = await this.statusRepository.findOne({ where: { id } });
    if (!status) {
      throw new NotFoundException(`Status with ID ${id} not found`);
    }
    return status;
  }

  async create(createStatusDto: CreateStatusDto, userId?: number | null): Promise<Status> {
    const status = this.statusRepository.create({
      code: createStatusDto.code,
      name: createStatusDto.name,
      description: createStatusDto.description,
      color: createStatusDto.color,
      isActive: createStatusDto.isActive ?? true,
      sortOrder: createStatusDto.sortOrder ?? 0,
      applicableEntities: createStatusDto.applicableEntities,
      createdBy: userId || null, // Automatically assign userId, null if no auth
      assignedTo: createStatusDto.assignedTo,
    });
    return this.statusRepository.save(status);
  }

  async update(id: string, updateStatusDto: UpdateStatusDto): Promise<Status> {
    await this.statusRepository.update(id, updateStatusDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.statusRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Status not found');
    }
  }
}
