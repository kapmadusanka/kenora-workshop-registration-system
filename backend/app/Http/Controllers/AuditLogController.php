<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ListAuditLogsRequest;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use App\Services\AuditService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AuditLogController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private readonly AuditService $auditService) {}

    /**
     * GET /api/audit-logs
     */
    public function index(ListAuditLogsRequest $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', AuditLog::class);

        $logs = $this->auditService->list(
            $request->validated(),
            15
        );

        return AuditLogResource::collection($logs);
    }
}
