<template>
  <div>
    <div class="row">
      <div class="col-md-5">
        <h3>Local stream</h3>
        <video id="videoInput" ref="videoInput" autoplay width="480px" height="360px" poster="img/webrtc.png"></video>
      </div>
      <div class="col-md-2">
        <button id="start" :disabled="buttonAction.startBtn.disabled" @click="start" ref="start" class="btn btn-success">Start</button>
        <br/>
        <br/>
        <button id="stop" :disabled="buttonAction.stopBtn.disabled" @click="stop" ref="stop" class="btn btn-danger">Stop</button>
      </div>
      <div class="col-md-5">
        <h3>Remote stream</h3>
        <video id="videoOutput" ref="videoOutput" autoplay width="480px" height="360px" poster="img/webrtc.png"></video>
      </div>
    </div>
  </div>
</template>

<script>
import StreamingHelper from '../helper/streaming-helper'
import KurentoUtils from 'kurento-utils'
export default {
  name: 'HelloWorld',
  data () {
    return {
      wws: new WebSocket('wss://localhost:8443/demo'),
      videoInput: null,
      videoOutput: null,
      webRtcPeer: null,
      state: null,
      buttonAction: {
        startBtn: {
          disabled: false
        },
        stopBtn: {
          disabled: true
        }
      }
    }
  },
  methods: {
    start: function () {
      console.log('Starting video call ...')
      // Disable start button
      this.setState(StreamingHelper.I_AM_STARTING)

      console.log('Creating WebRtcPeer and generating local sdp offer ...')

      let options = {
        localVideo: this.videoInput,
        remoteVideo: this.videoOutput,
        onicecandidate: this.onIceCandidate
      }
      let target = this
      this.webRtcPeer = KurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function (error) {
        if (error) return target.onError(error)
        this.generateOffer(this.onOffer)
      })
    },
    onIceCandidate: function (candidate) {
      console.log('Local candidate' + JSON.stringify(candidate))

      let message = {
        id: 'onIceCandidate',
        candidate: candidate
      }
      this.sendMessage(message)
    },
    onOffer: function (error, offerSdp) {
      if (error) return this.onError(error)

      console.info('Invoking SDP offer callback function ' + location.host)
      let message = {
        id: 'start',
        sdpOffer: offerSdp
      }
      this.sendMessage(message)
    },
    stop: function () {
      console.log('Stopping video call ...')
      this.setState(StreamingHelper.I_CAN_START)
      if (this.webRtcPeer) {
        this.webRtcPeer.dispose()
        this.webRtcPeer = null
        let message = {
          id: 'stop'
        }
        this.sendMessage(message)
      }
    },
    startResponse: function (message) {
      this.setState(StreamingHelper.I_CAN_STOP)
      console.log('SDP answer received from server. Processing ...')
      this.webRtcPeer.processAnswer(message.sdpAnswer)
    },
    sendMessage: function (message) {
      let jsonMessage = JSON.stringify(message)
      console.log('Senging message: ' + jsonMessage)
      this.wws.send(jsonMessage)
    },
    onError: function (error) {
      console.error(error.message)
    },
    setState: function (nextState) {
      switch (nextState) {
        case StreamingHelper.I_CAN_START:
          this.buttonAction.startBtn.disabled = false
          this.buttonAction.stopBtn.disabled = true
          break
        case StreamingHelper.I_CAN_STOP:
          this.buttonAction.startBtn.disabled = true
          this.buttonAction.stopBtn.disabled = false
          break
        case StreamingHelper.I_AM_STARTING:
          this.buttonAction.startBtn.disabled = true
          this.buttonAction.stopBtn.disabled = true
          break
        default:
          this.onError('Unknown state ' + nextState)
          return
      }
      this.state = nextState
    },
    onMessage: function () {
      this.wws.onmessage = function (message) {
        let parsedMessage = JSON.parse(message.data)
        console.info('Received message: ' + message.data)

        switch (parsedMessage.id) {
          case 'startResponse':
            this.startResponse(parsedMessage)
            break
          case 'error':
            if (this.state === StreamingHelper.I_AM_STARTING) {
              this.setState(StreamingHelper.I_CAN_START)
            }
            this.onError('Error message from server: ' + parsedMessage.message)
            break
          case 'iceCandidate':
            this.webRtcPeer.addIceCandidate(parsedMessage.candidate)
            break
          default:
            if (this.state === StreamingHelper.I_AM_STARTING) {
              this.setState(StreamingHelper.I_CAN_START)
            }
            this.onError('Unrecognized message', parsedMessage)
        }
      }
    }
  },
  mounted () {
    console.log('Page loaded ...')
    this.videoInput = this.$refs.videoInput
    this.videoOutput = this.$refs.videoOutput
    this.onMessage()
  },
  destroyed () {
    this.wws.close()
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
