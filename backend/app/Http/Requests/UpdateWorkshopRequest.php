<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\WorkshopStatus;
use App\Models\Workshop;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateWorkshopRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'code' => ['sometimes', 'string', 'max:30'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'instructor' => ['sometimes', 'required', 'string', 'max:255'],
            'starts_at' => ['sometimes', 'required', 'date'],
            'ends_at' => ['sometimes', 'nullable', 'date'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'capacity' => ['sometimes', 'required', 'integer', 'min:1', 'max:1000'],
            'status' => [
                'sometimes',
                'required',
                'string',
                Rule::in(array_map(fn (WorkshopStatus $s) => $s->value, WorkshopStatus::cases())),
            ],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var Workshop|int|string|null $workshopParam */
            $workshopParam = $this->route('workshop') ?? $this->route('id');
            $workshop = $workshopParam instanceof Workshop
                ? $workshopParam
                : Workshop::find($workshopParam);

            if (! $workshop) {
                return;
            }

            // Code immutability rule: reject with 422 if changed
            if ($this->has('code') && strtoupper(trim((string) $this->code)) !== $workshop->code) {
                $validator->errors()->add('code', 'The workshop code cannot be changed.');
            }

            // Date validation: ends_at must be after starts_at
            $startsAt = $this->has('starts_at')
                ? ($this->starts_at ? Carbon::parse($this->starts_at) : null)
                : $workshop->starts_at;

            $endsAt = $this->has('ends_at')
                ? ($this->ends_at ? Carbon::parse($this->ends_at) : null)
                : $workshop->ends_at;

            if ($startsAt && $endsAt && $endsAt->lte($startsAt)) {
                $validator->errors()->add('ends_at', 'The ends at field must be a date after starts at.');
            }
        });
    }
}
