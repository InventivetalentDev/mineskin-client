export interface Skin {
    /**
     * UUID of this skin
     */
    uuid: string;
    /**
     * Numeric ID of this skin - likely to be deprecated in the future, use uuid instead.
     */
    id: number;
    /**
     * Numeric ID of this skin, wrapped in a string
     */
    idStr: string;

    /**
     * Custom name given to this skin, may be empty
     */
    name: string;

    /**
     * Skin variant, either forced by the user or detected from the skin texture
     */
    variant: SkinVariant;

    /**
     * Skin data
     */
    data: SkinData;

    /**
     * Unix timestamp (seconds) when this skin was generated
     */
    timestamp: number;
    /**
     * Time in milliseconds how long generation took
     */
    duration: number;

    /**
     * Whether this skin is hidden from the public listing
     */
    private: boolean;

    /**
     * Amount of views/requests of this skin
     */
    views: number;
}

export interface GeneratedSkin extends Skin {
    /**
     * Whether the requested skin was generated before
     */
    duplicate: boolean;
    /**
     * Delay in seconds before sending the next generate request
     */
    nextRequest: number;
}

export interface SkinData {
    /**
     * Semi-random uuid of this skin data, may be a player uuid for user requests
     * This can be replaced by a randomly generated uuid
     */
    uuid: string;
    /**
     * Texture data
     */
    texture: SkinTexture;
}

export interface SkinTexture {
    /**
     * Skin texture value
     */
    value: string;
    /**
     * Skin texture signature
     */
    signature: string;

    /**
     * Url to the skin texture on <code>textures.minecraft.net</code>
     */
    url: string;
    urls: { skin: string } & { [k: string]: string }
}

export enum SkinVariant {
    CLASSIC = "classic",
    SLIM = "slim",
}

export enum SkinVisibility {
    PUBLIC = 0,
    PRIVATE = 1,
}

export enum GenerateType {
    UPLOAD = "upload",
    URL = "url",
    USER = "user"
}
