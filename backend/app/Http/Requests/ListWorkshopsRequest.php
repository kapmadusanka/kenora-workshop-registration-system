<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\WorkshopStatus;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListWorkshopsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('has_seats')) {
            $val = $this->has_seats;
            if (is_string($val)) {
                $lower = strtolower(trim($val));
                if (in_array($lower, ['true', '1'], true)) {
                    $this->merge(['has_seats' => true]);
                } elseif (in_array($lower, ['false', '0'], true)) {
                    $this->merge(['has_seats' => false]);
                }
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'status' => [
                'nullable',
                'string',
                function (string $attribute, mixed $value, Closure $fail): void {
                    $valid = array_map(fn (WorkshopStatus $s) => $s->value, WorkshopStatus::cases());
                    $parts = array_filter(array_map('trim', explode(',', (string) $value)));

                    if (empty($parts)) {
                        $fail('The status filter must contain at least one valid status.');

                        return;
                    }

                    foreach ($parts as $part) {
                        if (! in_array($part, $valid, true)) {
                            $fail("The selected status '{$part}' is invalid.");

                            return;
                        }
                    }
                },
            ],
            'has_seats' => ['nullable', 'boolean'],
            'q' => ['nullable', 'string', 'max:255'],
            'sort' => ['nullable', 'string', Rule::in(['starts_at', '-starts_at'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
