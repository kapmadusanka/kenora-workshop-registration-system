import { z } from "zod";


export function getDefaultValuesFromSchema<T extends z.ZodTypeAny>(
    schema: T,
): z.infer<T> {
    const def = (schema as unknown as { _def?: { typeName?: string; schema?: z.ZodTypeAny } })._def;
    if (def?.typeName === "ZodEffects" && def.schema) {
        return getDefaultValuesFromSchema(def.schema);
    }

    if (schema instanceof z.ZodObject) {
        const shape = schema.shape;
        const defaults: Record<string, unknown> = {};

        for (const key in shape) {
            const fieldSchema = shape[key];
            defaults[key] = getDefaultValueForField(fieldSchema);
        }

        return defaults as z.infer<T>;
    }

    return {} as z.infer<T>;
}

/**
 * Get default value for individual field based on its type
 */
function getDefaultValueForField(fieldSchema: z.ZodTypeAny): unknown {
    const def = (fieldSchema as unknown as {
        _def?: { defaultValue?: unknown; typeName?: string; schema?: z.ZodTypeAny };
    })._def;

    if (fieldSchema instanceof z.ZodDefault && def?.defaultValue !== undefined) {
        const defValue = def.defaultValue;
        return typeof defValue === "function" ? (defValue as () => unknown)() : defValue;
    }

    if (def?.typeName === "ZodEffects" && def.schema) {
        return getDefaultValueForField(def.schema);
    }

    if (fieldSchema instanceof z.ZodOptional) {
        const innerType = fieldSchema.unwrap();
        if (innerType instanceof z.ZodDefault) {
            return getDefaultValueForField(innerType);
        }
        return undefined;
    }

    if (fieldSchema instanceof z.ZodNullable) {
        const innerType = fieldSchema.unwrap();
        if (innerType instanceof z.ZodDefault) {
            return getDefaultValueForField(innerType);
        }
        return null;
    }

    if (fieldSchema instanceof z.ZodString) {
        return "";
    }

    if (fieldSchema instanceof z.ZodNumber) {
        return 0;
    }

    if (fieldSchema instanceof z.ZodBoolean) {
        return false;
    }

    if (fieldSchema instanceof z.ZodArray) {
        return [];
    }

    if (fieldSchema instanceof z.ZodObject) {
        return getDefaultValuesFromSchema(fieldSchema);
    }

    if (fieldSchema instanceof z.ZodEnum || def?.typeName === "ZodNativeEnum") {
        return "";
    }

    return null;
}

// ── FormData Conversion Utilities ─────────────────────────────────────────────

export type FormDataScalar =
  | string
  | number
  | boolean
  | null
  | undefined
  | Blob
  | FormDataScalar[]
  | { [key: string]: FormDataScalar };

function isDataUrl(value: string): boolean {
  return typeof value === "string" && /^data:([a-zA-Z0-9-+/.]+);base64,/.test(value);
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  const matches = dataUrl.match(/^data:([a-zA-Z0-9-+/.]+);base64,(.*)$/);
  if (!matches) return null;
  const mimeType = matches[1];
  const base64Data = matches[2];
  try {
    const byteCharacters = atob(base64Data);
    const arrayBuffer = new ArrayBuffer(byteCharacters.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteCharacters.length; i++) {
      uint8Array[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([arrayBuffer], { type: mimeType });
  } catch {
    return null;
  }
}

function appendToFormData(formData: FormData, key: string, value: unknown): void {
  if (value === null || value === undefined) {
    return;
  }

  // Handle File (File extends Blob)
  if (typeof File !== "undefined" && value instanceof File) {
    formData.append(key, value);
    return;
  }

  // Handle Blob
  if (typeof Blob !== "undefined" && value instanceof Blob) {
    formData.append(key, value);
    return;
  }

  // Handle Date
  if (value instanceof Date) {
    formData.append(key, value.toISOString());
    return;
  }

  // Handle Array: tags[]=one, tags[]=two
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item !== null && item !== undefined) {
        appendToFormData(formData, `${key}[]`, item);
      }
    }
    return;
  }

  // Handle base64 Data URL or regular string
  if (typeof value === "string") {
    if (isDataUrl(value)) {
      const blob = dataUrlToBlob(value);
      if (blob) {
        const mimeType = blob.type;
        const extension = (mimeType.split("/")[1] || "bin").replace(/\+.*$/, "");
        const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, "_");
        formData.append(key, blob, `${sanitizedKey}.${extension}`);
        return;
      }
    }
    formData.append(key, value);
    return;
  }

  // Handle number or boolean
  if (typeof value === "number" || typeof value === "boolean") {
    formData.append(key, String(value));
    return;
  }

  // Handle Nested Plain Object: parent[child]
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const subKey of Object.keys(obj)) {
      const subValue = obj[subKey];
      if (subValue !== null && subValue !== undefined) {
        appendToFormData(formData, `${key}[${subKey}]`, subValue);
      }
    }
    return;
  }
}

/**
 * Converts a typed object into a FormData instance.
 * Supports string, number, boolean, null/undefined, File, Blob, base64 data URLs,
 * arrays (tags[]=one), and nested objects (parent[child]).
 */
export function objectToFormData<T extends Record<string, unknown>>(data: T): FormData {
  const formData = new FormData();
  for (const key of Object.keys(data)) {
    appendToFormData(formData, key, data[key]);
  }
  return formData;
}
