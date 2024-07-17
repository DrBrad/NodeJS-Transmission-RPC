const axios = require('axios');
//const { encode } = require('base-64');

class Transmission {
    
    static TR_STATUS_STOPPED = 0;
    static TR_STATUS_CHECK_WAIT = 1;
    static TR_STATUS_CHECK = 2;
    static TR_STATUS_DOWNLOAD_WAIT = 3;
    static TR_STATUS_DOWNLOAD = 4;
    static TR_STATUS_SEED_WAIT = 5;
    static TR_STATUS_SEED = 6;

    static RPC_LT_14_TR_STATUS_CHECK_WAIT = 1;
    static RPC_LT_14_TR_STATUS_CHECK = 2;
    static RPC_LT_14_TR_STATUS_DOWNLOAD = 4;
    static RPC_LT_14_TR_STATUS_SEED = 8;
    static RPC_LT_14_TR_STATUS_STOPPED = 16;

    constructor(url = 'http://localhost:9091/transmission/rpc', username = null, password = null) {
        this.url = url;
        this.username = username;
        this.password = password;
        this.sessionId = null;
        this.rpcVersion = null;
        this.initSessionId().then(() => this.setRpcVersion());
    }

    async initSessionId() {
        try{
            const headers = {
                'User-Agent': 'TransmissionUN for Node.js'
            };
    
            //if (this.username && this.password) {
            //  headers['Authorization'] = 'Basic ' + encode(`${this.username}:${this.password}`);
            //}
    
            const response = await axios.get(this.url, { headers, validateStatus: status => status === 409 || status < 400 });
    
            if(response.status === 409){
                this.sessionId = response.headers['x-transmission-session-id'];

            }else{
                throw new Error('Unexpected response from transmission');
            }

        }catch(e){
            throw new Error('Unable to connect to ' + this.url);
        }
    }

    async setRpcVersion(){
        const sessionData = await this.sessionGet();
        this.rpcVersion = sessionData.arguments['rpc-version'];
    }

    async request(method, args = {}){
        const headers = {
            'Content-Type': 'application/json',
            'X-Transmission-Session-Id': this.sessionId
        };
    
        //if (this.username && this.password) {
        //  headers['Authorization'] = 'Basic ' + encode(`${this.username}:${this.password}`);
        //}
    
        const data = {
            method: method,
            arguments: args,
        };
    
        try{
            const response = await axios.post(this.url, data, { headers });
            return response.data;

        }catch(error){
            if(error.response && error.response.status === 409){
                this.sessionId = error.response.headers['x-transmission-session-id'];
                return this.request(method, args);
            }else{
                throw new Error('Unable to connect to ' + this.url);
            }
        }
    }
  
    async startTorrents(ids){
        if(!Array.isArray(ids)) ids = [ids];
        return this.request('torrent-start', { ids });
    }
  
    async stopTorrents(ids){
        if(!Array.isArray(ids)) ids = [ids];
        return this.request('torrent-stop', { ids });
    }
  
    async verifyTorrents(ids){
        if(!Array.isArray(ids)) ids = [ids];
        return this.request('torrent-verify', { ids });
    }
  
    async reannounceTorrents(ids){
        if(!Array.isArray(ids)) ids = [ids];
        return this.request('torrent-reannounce', { ids });
    }
  
    async setTorrents(ids, args = {}){
        if(!Array.isArray(ids)) ids = [ids];
        args.ids = ids;
        return this.request('torrent-set', args);
    }
  
    async getTorrent(id, fields = null){
        if(!Array.isArray(id)) id = [id];
        return this.request('torrent-get', { fields: fields || ['id', 'name', 'status', 'doneDate', 'haveValid', 'totalSize'], ids: id });
    }
  
    async listTorrents(fields = []){
        return this.request('torrent-get', { fields: fields.length ? fields : ['id', 'name', 'status', 'doneDate', 'haveValid', 'totalSize', 'percentDone', 'peersConnected', 'eta'] });
    }
  
    async addFile(torrent, save = '', extra = {}){
        extra['download-dir'] = save;
        extra['filename'] = torrent;
        return this.request('torrent-add', extra);
    }
  
    async addMetaInfo(meta, save = '', extra = {}){
        extra['download-dir'] = save;
        extra['metainfo'] = Buffer.from(meta).toString('base64');
        return this.request('torrent-add', extra);
    }
  
    async removeTorrent(ids, deleteData = false){
        if(!Array.isArray(ids)) ids = [ids];
        return this.request('torrent-remove', { ids, 'delete-local-data': deleteData });
    }
  
    async moveTorrent(ids, location, moveExisting){
        if(!Array.isArray(ids)) ids = [ids];
        return this.request('torrent-set-location', { ids, location, move: moveExisting });
    }
  
    async renameTorrent(ids, location, name){
        if(!Array.isArray(ids)) ids = [ids];
        if(ids.length !== 1) throw new Error('Cannot rename more than one torrent at a time.');
        return this.request('torrent-rename-path', { ids, path: location, name });
    }
  
    async sessionGet(){
        return this.request('session-get');
    }
  
    async sessionSet(){
        return this.request('session-set');
    }
  
    async sessionStats(){
        return this.request('session-stats');
    }
  
    getStatusString(status){
        if(this.rpcVersion < 14){
            switch (status){
                case Transmission.RPC_LT_14_TR_STATUS_CHECK_WAIT:
                    return 'Waiting to verify local files';

                case Transmission.RPC_LT_14_TR_STATUS_CHECK:
                    return 'Verifying local files';

                case Transmission.RPC_LT_14_TR_STATUS_DOWNLOAD:
                    return 'Downloading';

                case Transmission.RPC_LT_14_TR_STATUS_SEED:
                    return 'Seeding';

                case Transmission.RPC_LT_14_TR_STATUS_STOPPED:
                    return 'Stopped';

                default:
                    return 'Unknown';
            }
            
          }else{
            switch (status) {
                case Transmission.TR_STATUS_CHECK_WAIT:
                    return 'Waiting to verify local files';

                case Transmission.TR_STATUS_CHECK:
                    return 'Verifying local files';

                case Transmission.TR_STATUS_DOWNLOAD:
                    return 'Downloading';

                case Transmission.TR_STATUS_SEED:
                    return 'Seeding';

                case Transmission.TR_STATUS_STOPPED:
                    return 'Stopped';

                case Transmission.TR_STATUS_SEED_WAIT:
                    return 'Queued for seeding';

                case Transmission.TR_STATUS_DOWNLOAD_WAIT:
                    return 'Queued for download';

                default:
                    return 'Unknown';
            }
        }
    }
}

module.exports = Transmission;
