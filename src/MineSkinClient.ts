import { GeneratedSkin, GenerateType, Skin, SkinVariant, GenerateOptions, User } from "./types";
import { JobQueue } from "jobqu";
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { AsyncLoadingCache, Caches, Time } from "@inventivetalent/loading-cache";
import { Maybe } from "./util";
import FormData = require("form-data");

const DEFAULT_OPTIONS: MineSkinClientOptions = {
    userAgent: "MineSkinClient/NodeJS",
    apiBase: "https://api.mineskin.org",
    maxTries: 4
};

export class MineSkinClient {

    private readonly _options: Required<MineSkinClientOptions>;

    private generateInstance: AxiosInstance;
    private getInstance: AxiosInstance;

    private readonly generateQueue: JobQueue<AxiosRequestConfig, AxiosResponse>
        = new JobQueue<AxiosRequestConfig, AxiosResponse>(request => this.generateInstance.request(request), Time.seconds(15));
    private readonly getQueue: JobQueue<AxiosRequestConfig, AxiosResponse>
        = new JobQueue<AxiosRequestConfig, AxiosResponse>(request => this.getInstance.request(request), Time.seconds(1));

    private readonly skinByUuidCache: AsyncLoadingCache<string, Skin> = Caches.builder()
        .expireAfterAccess(Time.minutes(2))
        .expireAfterWrite(Time.minutes(5))
        .expirationInterval(Time.seconds(30))
        .buildAsync<string, Skin>(uuid => {
            return this._getSkin(uuid);
        });
    private readonly userByUuidCache: AsyncLoadingCache<string, User> = Caches.builder()
        .expireAfterWrite(Time.minutes(5))
        .expirationInterval(Time.seconds(30))
        .buildAsync<string, User>(uuid => {
            return this.getQueue.add({
                url: `/validate/uuid/${ uuid }`
            })
                .then(response => response.data as User)
                .then(user => {
                    if (user && user.valid) {
                        this.userByNameCache.put(user.name.toLowerCase(), user);
                    }
                    return user;
                });
        });
    private readonly userByNameCache: AsyncLoadingCache<string, User> = Caches.builder()
        .expireAfterWrite(Time.minutes(5))
        .expirationInterval(Time.seconds(30))
        .buildAsync<string, User>(name => {
            return this.getQueue.add({
                url: `/validate/name/${ name }`
            })
                .then(response => response.data as User)
                .then(user => {
                    if (user && user.valid) {
                        this.userByUuidCache.put(user.uuid, user);
                    }
                    return user;
                });
        });


    constructor(options?: MineSkinClientOptions) {
        if (!options?.userAgent) {
            console.warn("No custom user-agent set for MineSkinClient");
        }
        this._options = { ...DEFAULT_OPTIONS, ...options } as Required<MineSkinClientOptions>;

        const headers: any = {
            "User-Agent": this.options.userAgent,
            "Content-Type": "application/json"
        };
        if (this.options?.apiKey) {
            headers["Authorization"] = `Bearer ${ this.options.apiKey }`;
        }

        this.generateInstance = axios.create({
            baseURL: this.options.apiBase,
            method: "POST",
            headers: headers,
            timeout: 30000
        });
        this.getInstance = axios.create({
            baseURL: this.options.apiBase,
            method: "GET",
            headers: headers,
            timeout: 10000
        });
    }

    get options(): Required<MineSkinClientOptions> {
        return this._options;
    }

    private _generate(request: AxiosRequestConfig, retry: number): Promise<AxiosResponse> {
        return this.generateQueue.add(request).catch(err => {
            if (err.response) {
                let code = (err.response as AxiosResponse).status;
                if (retry > 0 && (code < 400 || code >= 500)) {
                    // Try again if we have retries left and it's not a client error
                    return this._generate(request, retry - 1);
                }
            }
            throw err;
        });
    }

    private _handleGenerateResponse(response: AxiosResponse): GeneratedSkin {
        const skin = response.data as GeneratedSkin;
        if (skin) {
            this.skinByUuidCache.put(skin.uuid, skin);
        }
        return skin;
    }

    private _getSkin(uuid: string): Promise<Maybe<Skin>> {
        return this.getQueue.add({
            url: `/get/uuid/${ uuid }`
        }).then(response => {
            if (response.data) {
                return response.data as Skin;
            } else {
                return undefined;
            }
        }).catch(err => {
            if (err.response) {
                if ((err.response as AxiosResponse).status === 404) {
                    return undefined;
                }
            }
            throw err;
        });
    }

    ///////////////

    public generateUrl(url: string, options?: GenerateOptions): Promise<GeneratedSkin> {
        return this._generate({
            url: "/generate/url",
            data: {
                ...{ url: url },
                ...options
            }
        }, this.options.maxTries).then(response => this._handleGenerateResponse(response));
    }

    public generateUpload(data: Buffer, options?: GenerateOptions): Promise<GeneratedSkin> {
        const body = new FormData();
        if (options) {
            for (let [k, v] of Object.entries(options)) {
                body.append(k, v);
            }
        }
        body.append("file", data, {
            filename: "skin.png",
            contentType: "image/png"
        });
        return this._generate({
            url: "/generate/upload",
            headers: body.getHeaders({
                "Content-Type": "application/x-www-form-urlencoded"
            }),
            data: body
        }, this.options.maxTries).then(response => this._handleGenerateResponse(response));
    }

    public async generateUser(user: string, options?: GenerateOptions): Promise<GeneratedSkin> {
        let uuid;
        if (user.length > 16) {
            uuid = user;
        } else {
            uuid = await this.getUserByName(user).then(user => user.uuid);
        }
        if (!uuid) {
            throw new Error("invalid user");
        }
        return this._generate({
            url: "/generate/user",
            data: {
                ...{ uuid: uuid },
                ...options
            }
        }, this.options.maxTries).then(response => this._handleGenerateResponse(response));
    }


    //////////

    public getUserByUuid(uuid: string): Promise<User> {
        return this.userByUuidCache.get(uuid);
    }

    public getUserByName(name: string): Promise<User> {
        return this.userByNameCache.get(name.toLowerCase());
    }

    //////////

    public getSkin(uuid: string): Promise<Maybe<Skin>> {
        return this.skinByUuidCache.get(uuid);
    }

    //////////

    end(): void {
        this.getQueue.end();
        this.generateQueue.end();
        this.skinByUuidCache.end();
        this.userByNameCache.end();
        this.userByUuidCache.end();
    }

}


export interface MineSkinClientOptions {
    userAgent?: string;
    apiKey?: string;
    apiBase?: string;
    maxTries?: number;
}
