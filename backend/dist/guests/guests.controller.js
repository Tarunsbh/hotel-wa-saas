"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuestsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const guests_service_1 = require("./guests.service");
const create_guest_dto_1 = require("./dto/create-guest.dto");
const update_guest_dto_1 = require("./dto/update-guest.dto");
let GuestsController = class GuestsController {
    constructor(guestsService) {
        this.guestsService = guestsService;
    }
    getTags(req) {
        return this.guestsService.getTags(req.user.hotelId);
    }
    createTag(req, name, color) {
        return this.guestsService.createTag(req.user.hotelId, name, color);
    }
    deleteTag(req, tagId) {
        return this.guestsService.deleteTag(req.user.hotelId, tagId);
    }
    findAll(req, search, status, tag, page, limit) {
        return this.guestsService.findAll(req.user.hotelId, {
            search,
            status,
            tag,
            page,
            limit,
        });
    }
    findOne(req, id) {
        return this.guestsService.findOne(req.user.hotelId, id);
    }
    create(req, dto) {
        return this.guestsService.create(req.user.hotelId, dto);
    }
    update(req, id, dto) {
        return this.guestsService.update(req.user.hotelId, id, dto);
    }
    softDelete(req, id) {
        return this.guestsService.softDelete(req.user.hotelId, id);
    }
    forceDelete(req, id) {
        return this.guestsService.forceDelete(req.user.hotelId, id);
    }
    importCsv(req, file) {
        return this.guestsService.importCsv(req.user.hotelId, file.buffer);
    }
    optOut(req, id) {
        return this.guestsService.optOut(req.user.hotelId, id);
    }
    addTag(req, id, tagId) {
        return this.guestsService.addTag(req.user.hotelId, id, tagId);
    }
    removeTag(req, id, tagId) {
        return this.guestsService.removeTag(req.user.hotelId, id, tagId);
    }
};
exports.GuestsController = GuestsController;
__decorate([
    (0, common_1.Get)('tags'),
    (0, swagger_1.ApiOperation)({ summary: 'List all tags for hotel' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GuestsController.prototype, "getTags", null);
__decorate([
    (0, common_1.Post)('tags'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new tag' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                color: { type: 'string' },
            },
            required: ['name', 'color'],
        },
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('name')),
    __param(2, (0, common_1.Body)('color')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], GuestsController.prototype, "createTag", null);
__decorate([
    (0, common_1.Delete)('tags/:tagId'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a tag' }),
    (0, swagger_1.ApiParam)({ name: 'tagId', type: 'string' }),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('tagId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GuestsController.prototype, "deleteTag", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List guests with pagination and filters' }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'tag', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('tag')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, Number, Number]),
    __metadata("design:returntype", void 0)
], GuestsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single guest' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GuestsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a guest' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_guest_dto_1.CreateGuestDto]),
    __metadata("design:returntype", void 0)
], GuestsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a guest' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_guest_dto_1.UpdateGuestDto]),
    __metadata("design:returntype", void 0)
], GuestsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Soft delete a guest' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GuestsController.prototype, "softDelete", null);
__decorate([
    (0, common_1.Delete)(':id/force'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a guest and associated conversations from database' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GuestsController.prototype, "forceDelete", null);
__decorate([
    (0, common_1.Post)('import-csv'),
    (0, swagger_1.ApiOperation)({ summary: 'Import guests from CSV file' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.UploadedFile)(new common_1.ParseFilePipe({
        validators: [
            new common_1.MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
            new common_1.FileTypeValidator({ fileType: 'text/csv' }),
        ],
        fileIsRequired: true,
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], GuestsController.prototype, "importCsv", null);
__decorate([
    (0, common_1.Post)(':id/opt-out'),
    (0, swagger_1.ApiOperation)({ summary: 'Opt-out a guest from messaging' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GuestsController.prototype, "optOut", null);
__decorate([
    (0, common_1.Post)(':id/tags/:tagId'),
    (0, swagger_1.ApiOperation)({ summary: 'Add tag to guest' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, swagger_1.ApiParam)({ name: 'tagId', type: 'string' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('tagId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], GuestsController.prototype, "addTag", null);
__decorate([
    (0, common_1.Delete)(':id/tags/:tagId'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove tag from guest' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, swagger_1.ApiParam)({ name: 'tagId', type: 'string' }),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('tagId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], GuestsController.prototype, "removeTag", null);
exports.GuestsController = GuestsController = __decorate([
    (0, swagger_1.ApiTags)('guests'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('guests'),
    __metadata("design:paramtypes", [guests_service_1.GuestsService])
], GuestsController);
//# sourceMappingURL=guests.controller.js.map