<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\WorkshopStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWorkshopRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('code') && is_string($this->code)) {
            $this->merge([
                'code' => strtoupper(trim($this->code)),
            ]);
        }

        if (! $this->has('status') || $this->status === null) {
            $this->merge([
                'status' => WorkshopStatus::Draft->value,
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:30', 'unique:workshops,code'],
            'title' => ['required', 'string', 'max:255'],
            'instructor' => ['required', 'string', 'max:255'],
            'starts_at' => ['required', 'date', 'after:now'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'location' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'capacity' => ['required', 'integer', 'min:1', 'max:1000'],
            'status' => [
                'sometimes',
                'string',
                Rule::in([WorkshopStatus::Draft->value, WorkshopStatus::Open->value]),
            ],
        ];
    }
}
