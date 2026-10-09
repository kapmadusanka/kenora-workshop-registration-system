<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'attendee_name' => is_string($this->attendee_name) ? trim($this->attendee_name) : $this->attendee_name,
            'attendee_email' => is_string($this->attendee_email) ? strtolower(trim($this->attendee_email)) : $this->attendee_email,
        ]);
    }

    public function rules(): array
    {
        return [
            'attendee_name' => ['required', 'string', 'max:255'],
            'attendee_email' => ['required', 'string', 'email', 'max:255'],
        ];
    }
}
