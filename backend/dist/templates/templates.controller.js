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
exports.TemplatesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const templates_service_1 = require("./templates.service");
const create_template_dto_1 = require("./dto/create-template.dto");
const update_template_dto_1 = require("./dto/update-template.dto");
let TemplatesController = class TemplatesController {
    constructor(templatesService) {
        this.templatesService = templatesService;
    }
    findAll(req, status, category, page, limit) {
        return this.templatesService.findAll(req.user.hotelId, {
            status,
            category,
            page,
            limit,
        });
    }
    findOne(req, id) {
        return this.templatesService.findOne(req.user.hotelId, id);
    }
    create(req, dto) {
        return this.templatesService.create(req.user.hotelId, dto);
    }
    update(req, id, dto) {
        return this.templatesService.update(req.user.hotelId, id, dto);
    }
    softDelete(req, id) {
        return this.templatesService.softDelete(req.user.hotelId, id);
    }
    sync(req, wabaId) {
        return this.templatesService.syncFromMeta(req.user.hotelId, wabaId);
    }
    async deleteOnMeta(req, id) {
        return this.templatesService.deleteOnMeta(req.user.hotelId, id);
    }
    duplicate(req, id) {
        return this.templatesService.duplicate(req.user.hotelId, id);
    }
    submitToMeta(req, id) {
        return this.templatesService.submitToMeta(req.user.hotelId, id);
    }
};
exports.TemplatesController = TemplatesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all templates with filters' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'category', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('category')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Number, Number]),
    __metadata("design:returntype", void 0)
], TemplatesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single template' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TemplatesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a template' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_template_dto_1.CreateTemplateDto]),
    __metadata("design:returntype", void 0)
], TemplatesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a template' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_template_dto_1.UpdateTemplateDto]),
    __metadata("design:returntype", void 0)
], TemplatesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Soft delete a template' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TemplatesController.prototype, "softDelete", null);
__decorate([
    (0, common_1.Post)('sync'),
    (0, swagger_1.ApiOperation)({ summary: 'Sync templates from Meta WABA (uses hotel stored wabaId if not provided)' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('wabaId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TemplatesController.prototype, "sync", null);
__decorate([
    (0, common_1.Post)(':id/delete-on-meta'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete template on Meta by name' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "deleteOnMeta", null);
__decorate([
    (0, common_1.Post)(':id/duplicate'),
    (0, swagger_1.ApiOperation)({ summary: 'Duplicate a template' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TemplatesController.prototype, "duplicate", null);
__decorate([
    (0, common_1.Post)(':id/submit'),
    (0, swagger_1.ApiOperation)({ summary: 'Submit DRAFT template to Meta for approval' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TemplatesController.prototype, "submitToMeta", null);
exports.TemplatesController = TemplatesController = __decorate([
    (0, swagger_1.ApiTags)('templates'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('templates'),
    __metadata("design:paramtypes", [templates_service_1.TemplatesService])
], TemplatesController);
//# sourceMappingURL=templates.controller.js.map